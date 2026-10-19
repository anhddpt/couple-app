alter table public.couple_spaces
  add column if not exists created_at timestamptz not null default now();

create table public.voice_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  storage_path text not null unique,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz,
  cleanup_token uuid,
  cleanup_claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index voice_upload_reservations_user_recent_idx
  on public.voice_upload_reservations(user_id, created_at desc);

alter table public.voice_upload_reservations enable row level security;
create policy voice_upload_reservations_own_select
  on public.voice_upload_reservations for select to authenticated
  using (user_id = auth.uid());
grant select on public.voice_upload_reservations to authenticated;

create table public.postcard_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index postcard_generation_jobs_user_recent_idx
  on public.postcard_generation_jobs(user_id, created_at desc);
alter table public.postcard_generation_jobs enable row level security;

create or replace function private.assert_active_user()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
end;
$$;

revoke all on function private.assert_active_user() from public, anon, authenticated;

create or replace function private.can_upload_reserved_voice(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and private.is_active_user(auth.uid())
    and exists (
      select 1
      from public.voice_upload_reservations r
      where r.user_id = auth.uid()
        and r.storage_path = p_storage_path
        and r.used_at is null
        and r.cleanup_token is null
        and r.expires_at > now()
        and private.get_active_couple_id(auth.uid()) = r.couple_id
    );
$$;

revoke all on function private.can_upload_reserved_voice(text) from public, anon;
grant execute on function private.can_upload_reserved_voice(text) to authenticated;

drop policy if exists voice_clips_owner_insert on storage.objects;
create policy voice_clips_reserved_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'voice-clips'
  and private.can_upload_reserved_voice(name)
);

drop policy if exists voice_clips_owner_delete on storage.objects;
drop policy if exists voice_clips_unfinalized_delete on storage.objects;

create or replace function public.get_couple_space()
returns setof public.couple_spaces
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  insert into public.couple_spaces(couple_id) values (v_couple_id)
  on conflict (couple_id) do nothing;
  return query
  select cs.couple_id, cs.room_theme, cs.pet_type, cs.pet_name,
    case
      when coalesce(cs.last_cared_at, cs.created_at) < now() - interval '48 hours' then 'hungry'
      when coalesce(cs.last_cared_at, cs.created_at) < now() - interval '24 hours' then 'sleepy'
      else 'happy'
    end,
    cs.pet_xp, cs.couple_outfit, cs.last_cared_at, cs.updated_at, cs.created_at
  from public.couple_spaces cs
  where cs.couple_id = v_couple_id;
end;
$$;

create or replace function public.care_for_pet()
returns setof public.couple_spaces
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  insert into public.couple_spaces(couple_id, pet_xp, last_cared_at)
  values (v_couple_id, 1, now())
  on conflict (couple_id) do update set
    pet_xp = public.couple_spaces.pet_xp + 1,
    pet_mood = 'happy',
    last_cared_at = now(),
    updated_at = now();
  return query select * from public.get_couple_space();
end;
$$;

create or replace function public.register_device(
  p_expo_push_token text,
  p_device_fingerprint text,
  p_platform public.device_platform
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_device_id uuid;
begin
  perform private.assert_active_user();
  delete from public.devices
  where expo_push_token = p_expo_push_token and user_id <> auth.uid();
  insert into public.devices(user_id, platform, expo_push_token, device_fingerprint)
  values (auth.uid(), p_platform, p_expo_push_token, p_device_fingerprint)
  on conflict (user_id, device_fingerprint) do update set
    platform = excluded.platform,
    expo_push_token = excluded.expo_push_token,
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  returning id into v_device_id;
  return v_device_id;
end;
$$;

create or replace function public.set_notification_content_mode(
  p_content_mode public.notification_content_mode
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_active_user();
  insert into public.user_notification_settings(user_id, content_mode)
  values (auth.uid(), p_content_mode)
  on conflict (user_id) do update set content_mode = excluded.content_mode, updated_at = now();
end;
$$;

create or replace function public.set_notification_push_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_active_user();
  insert into public.user_notification_settings(user_id, push_enabled)
  values (auth.uid(), p_enabled)
  on conflict (user_id) do update set push_enabled = excluded.push_enabled, updated_at = now();
  if p_enabled = false then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Push disabled by receiver'
    from public.interactions i
    where nd.interaction_id = i.id and i.receiver_id = auth.uid()
      and nd.status in ('pending', 'processing');
  end if;
end;
$$;

create or replace function public.set_action_enabled(
  p_action_type public.action_type,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_active_user();
  insert into public.user_action_settings(user_id, action_type, enabled)
  values (auth.uid(), p_action_type, p_enabled)
  on conflict (user_id, action_type) do update set enabled = excluded.enabled, updated_at = now();
  if p_enabled = false then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Action disabled by receiver'
    from public.interactions i
    where nd.interaction_id = i.id and i.receiver_id = auth.uid()
      and i.action_type = p_action_type and nd.status in ('pending', 'processing');
  end if;
end;
$$;

create or replace function public.set_action_push_enabled(
  p_action_type public.action_type,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_active_user();
  insert into public.user_action_settings(user_id, action_type, push_enabled)
  values (auth.uid(), p_action_type, p_enabled)
  on conflict (user_id, action_type) do update set
    push_enabled = excluded.push_enabled,
    updated_at = now();
  if p_enabled = false then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Action push disabled by receiver'
    from public.interactions i
    where nd.interaction_id = i.id and i.receiver_id = auth.uid()
      and i.action_type = p_action_type and nd.status in ('pending', 'processing');
  end if;
end;
$$;

create or replace function public.set_quiet_hours(
  p_enabled boolean,
  p_start time,
  p_end time,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_active_user();
  perform now() at time zone p_timezone;
  insert into public.user_notification_settings(
    user_id, quiet_hours_enabled, quiet_start, quiet_end, timezone
  ) values (auth.uid(), p_enabled, p_start, p_end, p_timezone)
  on conflict (user_id) do update set
    quiet_hours_enabled = excluded.quiet_hours_enabled,
    quiet_start = excluded.quiet_start,
    quiet_end = excluded.quiet_end,
    timezone = excluded.timezone,
    updated_at = now();
  if p_enabled and private.is_in_quiet_hours(auth.uid()) then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Quiet hours', updated_at = now()
    from public.interactions i
    where nd.interaction_id = i.id and i.receiver_id = auth.uid()
      and nd.status in ('pending', 'processing');
  end if;
end;
$$;

create or replace function public.unmatch_current_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  perform private.assert_active_user();
  select acm.couple_id into v_couple_id
  from public.active_couple_memberships acm
  where acm.user_id = auth.uid();
  if v_couple_id is null then return; end if;
  perform 1 from public.couples where id = v_couple_id for update;
  update public.couples set
    status = 'ended', ended_at = now(), ended_by = auth.uid(), purge_after = now() + interval '10 days'
  where id = v_couple_id and status = 'active';
  delete from public.active_couple_memberships where couple_id = v_couple_id;
  update public.notification_deliveries nd
  set status = 'suppressed', last_error = 'Couple ended'
  from public.interactions i
  where nd.interaction_id = i.id and i.couple_id = v_couple_id
    and nd.status in ('pending', 'processing');
end;
$$;

drop function if exists public.update_couple_space(text, text, text, text);
create function public.update_couple_space(
  p_room_theme text,
  p_pet_type text,
  p_pet_name text,
  p_couple_outfit text,
  p_expected_updated_at timestamptz
)
returns setof public.couple_spaces
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  if p_room_theme not in ('sunset', 'night', 'garden') then raise exception 'Invalid room theme'; end if;
  if p_pet_type not in ('cat', 'dog', 'bunny') then raise exception 'Invalid pet type'; end if;
  if p_couple_outfit not in ('classic', 'cozy', 'party') then raise exception 'Invalid couple outfit'; end if;

  update public.couple_spaces set
    room_theme = p_room_theme,
    pet_type = p_pet_type,
    pet_name = trim(p_pet_name),
    couple_outfit = p_couple_outfit,
    updated_at = now()
  where couple_id = v_couple_id and updated_at = p_expected_updated_at;
  if not found then raise exception 'Shared space changed. Reload and try again'; end if;
  return query select * from public.get_couple_space();
end;
$$;

create or replace function public.reserve_voice_upload()
returns table (reservation_id uuid, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_id uuid := gen_random_uuid();
  v_path text;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('voice-upload:' || auth.uid()::text, 0));
  if (
    select count(*) from public.voice_upload_reservations
    where user_id = auth.uid() and used_at is null and expires_at > now()
  ) >= 3 then
    raise exception 'Too many pending voice uploads';
  end if;
  if (
    select count(*) from public.voice_upload_reservations
    where user_id = auth.uid() and created_at > now() - interval '10 minutes'
  ) >= 10 then
    raise exception 'Voice upload rate limit exceeded';
  end if;
  v_path := auth.uid()::text || '/' || v_id::text || '.m4a';
  insert into public.voice_upload_reservations(id, user_id, couple_id, storage_path)
  values (v_id, auth.uid(), v_couple_id, v_path);
  return query select v_id, v_path;
end;
$$;

drop function if exists public.send_voice_action(text, integer, uuid, timestamptz);
create function public.send_voice_action(
  p_reservation_id uuid,
  p_duration_ms integer,
  p_client_event_id uuid,
  p_client_created_at timestamptz default null
)
returns setof public.interactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interaction public.interactions%rowtype;
  v_reservation public.voice_upload_reservations%rowtype;
begin
  if p_duration_ms not between 250 and 10000 then raise exception 'Voice clip must be 10 seconds or less'; end if;
  perform pg_advisory_xact_lock(
    hashtextextended('voice-event:' || auth.uid()::text || ':' || p_client_event_id::text, 0)
  );
  select i.* into v_interaction
  from public.interactions i
  where i.sender_id = auth.uid() and i.client_event_id = p_client_event_id;
  if v_interaction.id is not null then
    if v_interaction.action_type <> 'VOICE'::public.action_type or not exists (
      select 1 from public.voice_clips vc where vc.interaction_id = v_interaction.id
    ) then raise exception 'Client event id is already used'; end if;
    return next v_interaction;
    return;
  end if;
  select * into v_reservation
  from public.voice_upload_reservations
  where id = p_reservation_id and user_id = auth.uid()
    and used_at is null and cleanup_token is null
    and expires_at > now() - interval '5 minutes'
  for update;
  if v_reservation.id is null then raise exception 'Voice upload reservation unavailable'; end if;
  if private.get_active_couple_id(auth.uid()) <> v_reservation.couple_id then
    raise exception 'Active couple changed';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'voice-clips' and o.name = v_reservation.storage_path
  ) then
    raise exception 'Voice upload is missing';
  end if;

  select * into v_interaction from public.send_interaction(
    'self'::public.target_type, 'voice'::public.target_region, 'tap'::public.gesture_type,
    p_client_event_id, p_client_created_at
  );
  if v_interaction.action_type <> 'VOICE'::public.action_type then
    raise exception 'Client event id is already used';
  end if;
  insert into public.voice_clips(interaction_id, storage_path, duration_ms)
  values (v_interaction.id, v_reservation.storage_path, p_duration_ms)
  on conflict (interaction_id) do nothing;
  update public.voice_upload_reservations set used_at = now() where id = v_reservation.id;
  return next v_interaction;
end;
$$;

create or replace function public.claim_postcard_generation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_job_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('postcard:' || auth.uid()::text, 0));
  update public.postcard_generation_jobs set status = 'failed', completed_at = now(),
    last_error = 'Recovered stale generation job'
  where user_id = auth.uid() and status = 'pending' and created_at < now() - interval '30 minutes';
  if exists (
    select 1 from public.postcard_generation_jobs
    where user_id = auth.uid() and status = 'pending'
  ) then raise exception 'Postcard generation already in progress'; end if;
  if exists (
    select 1 from public.postcard_generation_jobs
    where user_id = auth.uid() and status in ('succeeded', 'failed')
      and created_at > now() - interval '60 seconds'
  ) then raise exception 'Please wait before generating another postcard'; end if;
  if (
    select count(*) from public.postcard_generation_jobs
    where user_id = auth.uid() and status = 'succeeded'
      and created_at > now() - interval '24 hours'
  ) >= 3 then raise exception 'Daily postcard limit reached'; end if;
  insert into public.postcard_generation_jobs(user_id, couple_id)
  values (auth.uid(), v_couple_id) returning id into v_job_id;
  return v_job_id;
end;
$$;

create or replace function public.complete_postcard_generation(
  p_job_id uuid,
  p_succeeded boolean,
  p_last_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.postcard_generation_jobs set
    status = case when p_succeeded then 'succeeded' else 'failed' end,
    last_error = p_last_error,
    completed_at = now()
  where id = p_job_id and status = 'pending';
  if not found then raise exception 'Postcard generation job is no longer pending'; end if;
end;
$$;

create or replace function public.list_voice_paths_for_user(p_user_id uuid)
returns table (storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  select paths.storage_path
  from (
    select vc.storage_path
    from public.voice_clips vc
    join public.interactions i on i.id = vc.interaction_id
    where i.sender_id = p_user_id or i.receiver_id = p_user_id
    union
    select r.storage_path
    from public.voice_upload_reservations r
    where r.user_id = p_user_id and r.used_at is null
  ) paths
  order by paths.storage_path;
$$;

create or replace function public.list_expired_couple_voice_paths()
returns table (storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  select vc.storage_path
  from public.voice_clips vc
  join public.interactions i on i.id = vc.interaction_id
  join public.couples c on c.id = i.couple_id
  where c.status = 'ended' and c.purge_after <= now()
  order by vc.storage_path;
$$;

create or replace function public.claim_expired_voice_uploads(p_limit integer default 100)
returns table (reservation_id uuid, storage_path text, cleanup_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare v_token uuid := gen_random_uuid();
begin
  delete from public.voice_upload_reservations
  where used_at < now() - interval '30 days';
  update public.voice_upload_reservations
  set cleanup_token = null, cleanup_claimed_at = null
  where cleanup_token is not null and cleanup_claimed_at < now() - interval '10 minutes';

  return query
  with claimed as (
    select r.id
    from public.voice_upload_reservations r
    where r.used_at is null
      and r.expires_at <= now() - interval '5 minutes'
      and r.cleanup_token is null
    order by r.expires_at
    for update skip locked
    limit greatest(1, least(p_limit, 500))
  ), updated as (
    update public.voice_upload_reservations r
    set cleanup_token = v_token, cleanup_claimed_at = now()
    from claimed
    where r.id = claimed.id
    returning r.id, r.storage_path, r.cleanup_token
  )
  select updated.id, updated.storage_path, updated.cleanup_token from updated;
end;
$$;

create or replace function public.complete_expired_voice_upload_cleanup(p_cleanup_token uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.voice_upload_reservations
  where cleanup_token = p_cleanup_token and used_at is null;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reserve_voice_upload() from public, anon;
revoke all on function public.send_voice_action(uuid, integer, uuid, timestamptz) from public, anon;
revoke all on function public.claim_postcard_generation() from public, anon;
grant execute on function public.reserve_voice_upload() to authenticated;
grant execute on function public.send_voice_action(uuid, integer, uuid, timestamptz) to authenticated;
grant execute on function public.claim_postcard_generation() to authenticated;
grant execute on function public.update_couple_space(text, text, text, text, timestamptz) to authenticated;

revoke all on function public.complete_postcard_generation(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.list_voice_paths_for_user(uuid) from public, anon, authenticated;
revoke all on function public.list_expired_couple_voice_paths() from public, anon, authenticated;
revoke all on function public.claim_expired_voice_uploads(integer) from public, anon, authenticated;
revoke all on function public.complete_expired_voice_upload_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.complete_postcard_generation(uuid, boolean, text) to service_role;
grant execute on function public.list_voice_paths_for_user(uuid) to service_role;
grant execute on function public.list_expired_couple_voice_paths() to service_role;
grant execute on function public.claim_expired_voice_uploads(integer) to service_role;
grant execute on function public.complete_expired_voice_upload_cleanup(uuid) to service_role;
