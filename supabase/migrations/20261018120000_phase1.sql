create schema if not exists private;
revoke all on schema private from public;
create extension if not exists pgcrypto with schema extensions;

create type public.account_status as enum ('active', 'deactivated', 'deletion_pending');
create type public.couple_status as enum ('active', 'ended');
create type public.invitation_status as enum ('active', 'used', 'expired', 'revoked');
create type public.mood_type as enum ('happy', 'angry', 'sad');
create type public.action_type as enum (
  'HEAD_PAT', 'BONK', 'PUSH_AWAY', 'HUG', 'HUNGRY', 'MISS_YOU', 'CHEEK_POKE', 'KISS', 'SLEEPY'
);
create type public.target_type as enum ('partner', 'self');
create type public.target_region as enum ('head', 'cheek', 'body', 'self_eyes', 'self_mouth', 'self_heart');
create type public.gesture_type as enum ('tap', 'long_press', 'drag_together');
create type public.notification_content_mode as enum ('generic', 'sender_only', 'detailed');
create type public.delivery_status as enum ('pending', 'processing', 'ticketed', 'sent', 'suppressed', 'failed');
create type public.device_platform as enum ('android', 'ios');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  account_status public.account_status not null default 'active',
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preset_id text not null check (preset_id in ('coral', 'sunny', 'mint')),
  updated_at timestamptz not null default now()
);

create table public.avatar_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_mood public.mood_type not null default 'happy',
  updated_at timestamptz not null default now()
);

create table public.pairing_invitations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  status public.invitation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table public.pairing_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  success boolean not null default false
);

create index pairing_attempts_user_recent_idx
  on public.pairing_attempts(user_id, attempted_at desc);

create unique index pairing_invitations_one_active_per_user
  on public.pairing_invitations(created_by)
  where status = 'active';

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  status public.couple_status not null default 'active',
  paired_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete set null,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.active_couple_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index active_couple_memberships_couple_idx
  on public.active_couple_memberships(couple_id);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  action_type public.action_type not null,
  actor_mood public.mood_type not null,
  target_type public.target_type not null,
  target_region public.target_region not null,
  gesture_type public.gesture_type not null,
  client_event_id uuid not null,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id),
  unique (sender_id, client_event_id)
);

create index interactions_receiver_latest_idx
  on public.interactions(receiver_id, created_at desc, id desc);
create index interactions_couple_created_idx
  on public.interactions(couple_id, created_at desc);

create table public.interaction_cursors (
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  last_consumed_created_at timestamptz,
  last_consumed_interaction_id uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id, couple_id),
  check (
    (last_consumed_created_at is null and last_consumed_interaction_id is null)
    or (last_consumed_created_at is not null and last_consumed_interaction_id is not null)
  )
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform public.device_platform not null,
  expo_push_token text not null unique,
  device_fingerprint text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_fingerprint)
);

create table public.user_action_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type public.action_type not null,
  enabled boolean not null default true,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, action_type)
);

create table public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  content_mode public.notification_content_mode not null default 'generic',
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  status public.delivery_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_ticket_id text,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  lease_id uuid,
  ticketed_at timestamptz,
  next_receipt_check_at timestamptz,
  receipt_attempt_count integer not null default 0 check (receipt_attempt_count >= 0),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interaction_id, device_id)
);

create index notification_deliveries_pending_idx
  on public.notification_deliveries(next_attempt_at, created_at)
  where status = 'pending';

create index notification_deliveries_receipt_idx
  on public.notification_deliveries(next_receipt_check_at, ticketed_at)
  where status = 'ticketed';

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  lease_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger avatars_touch_updated_at before update on public.avatars
for each row execute function public.touch_updated_at();
create trigger avatar_states_touch_updated_at before update on public.avatar_states
for each row execute function public.touch_updated_at();
create trigger couples_touch_updated_at before update on public.couples
for each row execute function public.touch_updated_at();
create trigger devices_touch_updated_at before update on public.devices
for each row execute function public.touch_updated_at();
create trigger action_settings_touch_updated_at before update on public.user_action_settings
for each row execute function public.touch_updated_at();
create trigger notification_settings_touch_updated_at before update on public.user_notification_settings
for each row execute function public.touch_updated_at();
create trigger notification_deliveries_touch_updated_at before update on public.notification_deliveries
for each row execute function public.touch_updated_at();
create trigger account_deletion_requests_touch_updated_at before update on public.account_deletion_requests
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.avatar_states(user_id) values (new.id)
  on conflict (user_id) do nothing;
  insert into public.user_notification_settings(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_defaults after insert on public.profiles
for each row execute function public.create_profile_defaults();

create or replace function private.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and account_status = 'active'
  );
$$;

create or replace function private.get_active_couple_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select acm.couple_id
  from public.active_couple_memberships acm
  join public.couples c on c.id = acm.couple_id and c.status = 'active'
  where acm.user_id = p_user_id;
$$;

create or replace function private.is_active_partner(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() <> p_owner
    and private.is_active_user(auth.uid())
    and private.is_active_user(p_owner)
    and private.get_active_couple_id(auth.uid()) is not null
    and private.get_active_couple_id(auth.uid()) = private.get_active_couple_id(p_owner);
$$;

create or replace function private.is_current_user_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = auth.uid()
  );
$$;

create or replace function private.resolve_action(
  p_mood public.mood_type,
  p_target_type public.target_type,
  p_target_region public.target_region,
  p_gesture_type public.gesture_type
)
returns public.action_type
language plpgsql
immutable
as $$
begin
  if p_target_type = 'partner' and p_target_region = 'head' and p_gesture_type = 'tap' then
    return case p_mood
      when 'happy' then 'HEAD_PAT'::public.action_type
      when 'angry' then 'BONK'::public.action_type
      when 'sad' then 'PUSH_AWAY'::public.action_type
    end;
  end if;

  if p_target_type = 'partner' and p_target_region = 'body' and p_gesture_type = 'drag_together' then
    return 'HUG'::public.action_type;
  end if;

  if p_target_type = 'self' and p_target_region = 'self_mouth' and p_gesture_type = 'tap' then
    return 'HUNGRY'::public.action_type;
  end if;

  if p_target_type = 'self' and p_target_region = 'self_heart' and p_gesture_type = 'tap' then
    return 'MISS_YOU'::public.action_type;
  end if;

  raise exception 'Unsupported interaction intent';
end;
$$;

create or replace function public.update_current_mood(p_mood public.mood_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;

  insert into public.avatar_states(user_id, current_mood)
  values (auth.uid(), p_mood)
  on conflict (user_id) do update set current_mood = excluded.current_mood, updated_at = now();
end;
$$;

create or replace function public.create_pairing_invitation()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_hash text;
  v_attempt integer := 0;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  if private.get_active_couple_id(auth.uid()) is not null then
    raise exception 'User already has an active couple';
  end if;

  update public.pairing_invitations
  set status = 'revoked'
  where created_by = auth.uid() and status = 'active';

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12));
    v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');
    begin
      insert into public.pairing_invitations(created_by, code_hash, expires_at)
      values (auth.uid(), v_hash, now() + interval '24 hours');
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function public.preview_pairing_invitation(p_code text)
returns table (
  invitation_id uuid,
  inviter_name text,
  inviter_avatar_preset text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
  v_invitation public.pairing_invitations%rowtype;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then return; end if;
  if private.get_active_couple_id(auth.uid()) is not null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('pairing-preview:' || auth.uid()::text, 0));
  if (
    select count(*) from public.pairing_attempts
    where user_id = auth.uid() and attempted_at > now() - interval '10 minutes'
  ) >= 10 then
    raise exception 'Too many invitation attempts';
  end if;

  select * into v_invitation
  from public.pairing_invitations
  where code_hash = v_hash and status = 'active' and expires_at > now();

  insert into public.pairing_attempts(user_id, success)
  values (auth.uid(), v_invitation.id is not null and v_invitation.created_by <> auth.uid());

  if v_invitation.id is null or v_invitation.created_by = auth.uid() then return; end if;
  if not private.is_active_user(v_invitation.created_by) then return; end if;
  if private.get_active_couple_id(v_invitation.created_by) is not null then return; end if;

  return query
  select v_invitation.id, p.display_name, coalesce(a.preset_id, 'coral')
  from public.profiles p
  left join public.avatars a on a.user_id = p.id
  where p.id = v_invitation.created_by and p.account_status = 'active';
end;
$$;

create or replace function public.redeem_pairing_invitation(p_invitation_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.pairing_invitations%rowtype;
  v_couple_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then
    raise exception 'Active account required';
  end if;
  if private.get_active_couple_id(auth.uid()) is not null then
    raise exception 'User already has an active couple';
  end if;

  select * into v_invitation
  from public.pairing_invitations
  where id = p_invitation_id
    and code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and status = 'active'
    and expires_at > now()
  for update;

  if v_invitation.id is null then raise exception 'Invalid or expired invitation'; end if;
  if v_invitation.created_by = auth.uid() then raise exception 'Cannot redeem your own invitation'; end if;
  if not private.is_active_user(v_invitation.created_by) then raise exception 'Invitation unavailable'; end if;
  if private.get_active_couple_id(v_invitation.created_by) is not null then
    raise exception 'Invitation creator already has an active couple';
  end if;

  insert into public.couples default values returning id into v_couple_id;
  insert into public.couple_members(couple_id, user_id)
  values (v_couple_id, v_invitation.created_by), (v_couple_id, auth.uid());
  insert into public.active_couple_memberships(user_id, couple_id)
  values (v_invitation.created_by, v_couple_id), (auth.uid(), v_couple_id);

  update public.pairing_invitations
  set status = 'used', used_at = now()
  where id = v_invitation.id;

  return v_couple_id;
end;
$$;

create or replace function public.get_active_couple_state()
returns table (
  couple_id uuid,
  paired_at timestamptz,
  partner_id uuid,
  partner_name text,
  partner_avatar_preset text,
  partner_mood public.mood_type,
  partner_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.paired_at,
    partner.user_id,
    case when pp.account_status = 'active' then pp.display_name else 'Unavailable' end,
    case when pp.account_status = 'active' then coalesce(a.preset_id, 'coral') else 'coral' end,
    case when pp.account_status = 'active' then coalesce(s.current_mood, 'happy') else 'happy' end,
    pp.account_status = 'active'
  from public.active_couple_memberships mine
  join public.couples c on c.id = mine.couple_id and c.status = 'active'
  join public.couple_members partner on partner.couple_id = c.id and partner.user_id <> auth.uid()
  join public.profiles pp on pp.id = partner.user_id
  left join public.avatars a on a.user_id = partner.user_id
  left join public.avatar_states s on s.user_id = partner.user_id
  where mine.user_id = auth.uid() and private.is_active_user(auth.uid());
$$;

create or replace function public.send_interaction(
  p_target_type public.target_type,
  p_target_region public.target_region,
  p_gesture_type public.gesture_type,
  p_client_event_id uuid,
  p_client_created_at timestamptz default null
)
returns setof public.interactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_couple_id uuid;
  v_receiver uuid;
  v_mood public.mood_type;
  v_action public.action_type;
  v_interaction public.interactions%rowtype;
  v_push_enabled boolean;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;

  select i.* into v_interaction
  from public.interactions i
  where i.sender_id = v_sender and i.client_event_id = p_client_event_id;
  if v_interaction.id is not null then
    return next v_interaction;
    return;
  end if;

  if not private.is_active_user(v_sender) then
    raise exception 'Active account required';
  end if;

  select acm.couple_id into v_couple_id
  from public.active_couple_memberships acm
  where acm.user_id = v_sender;
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  perform 1 from public.couples
  where id = v_couple_id and status = 'active'
  for update;
  if not found then raise exception 'Active couple required'; end if;

  select cm.user_id into v_receiver
  from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_sender;
  if v_receiver is null or not private.is_active_user(v_receiver) then
    raise exception 'Partner unavailable';
  end if;

  select current_mood into v_mood from public.avatar_states where user_id = v_sender;
  v_mood := coalesce(v_mood, 'happy');
  v_action := private.resolve_action(v_mood, p_target_type, p_target_region, p_gesture_type);

  if exists (
    select 1 from public.user_action_settings
    where user_id = v_receiver and action_type = v_action and enabled = false
  ) then
    raise exception 'Action unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_sender::text || ':' || v_receiver::text || ':' || v_action::text, 0)
  );

  if (
    select count(*) from public.interactions
    where sender_id = v_sender and receiver_id = v_receiver
      and action_type = v_action and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Action rate limit exceeded';
  end if;

  insert into public.interactions(
    couple_id, sender_id, receiver_id, action_type, actor_mood,
    target_type, target_region, gesture_type, client_event_id, client_created_at
  ) values (
    v_couple_id, v_sender, v_receiver, v_action, v_mood,
    p_target_type, p_target_region, p_gesture_type, p_client_event_id, p_client_created_at
  ) on conflict (sender_id, client_event_id) do nothing
  returning * into v_interaction;

  if v_interaction.id is null then
    select i.* into v_interaction
    from public.interactions i
    where i.sender_id = v_sender and i.client_event_id = p_client_event_id;
    return next v_interaction;
    return;
  end if;

  select coalesce(ns.push_enabled, true)
    and coalesce(action_setting.push_enabled, true)
  into v_push_enabled
  from (select 1) seed
  left join public.user_notification_settings ns on ns.user_id = v_receiver
  left join public.user_action_settings action_setting
    on action_setting.user_id = v_receiver and action_setting.action_type = v_action;

  if coalesce(v_push_enabled, true) then
    insert into public.notification_deliveries(interaction_id, device_id)
    select v_interaction.id, d.id
    from public.devices d
    where d.user_id = v_receiver and d.is_active = true
    on conflict (interaction_id, device_id) do nothing;
  end if;

  return next v_interaction;
end;
$$;

create or replace function public.peek_latest_interaction()
returns setof public.interactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_at timestamptz;
  v_interaction_id uuid;
  v_couple_id uuid;
  v_interaction public.interactions%rowtype;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then return; end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then return; end if;

  select last_consumed_created_at, last_consumed_interaction_id
  into v_created_at, v_interaction_id
  from public.interaction_cursors
  where user_id = auth.uid() and couple_id = v_couple_id;

  select i.* into v_interaction
  from public.interactions i
  join public.couples c on c.id = i.couple_id and c.status = 'active'
  where i.receiver_id = auth.uid() and i.couple_id = v_couple_id
    and (v_created_at is null or (i.created_at, i.id) > (v_created_at, v_interaction_id))
  order by i.created_at desc, i.id desc
  limit 1;

  if v_interaction.id is null then return; end if;
  return next v_interaction;
end;
$$;

create or replace function public.acknowledge_interaction(p_interaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interaction public.interactions%rowtype;
  v_created_at timestamptz;
  v_interaction_id uuid;
  v_couple_id uuid;
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) then return; end if;
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;

  select i.* into v_interaction
  from public.interactions i
  join public.couples c on c.id = i.couple_id and c.status = 'active'
  where i.id = p_interaction_id
    and i.receiver_id = auth.uid()
    and i.couple_id = v_couple_id;
  if v_interaction.id is null then raise exception 'Interaction unavailable'; end if;

  insert into public.interaction_cursors(user_id, couple_id)
  values (auth.uid(), v_couple_id)
  on conflict (user_id, couple_id) do nothing;

  select last_consumed_created_at, last_consumed_interaction_id
  into v_created_at, v_interaction_id
  from public.interaction_cursors
  where user_id = auth.uid() and couple_id = v_couple_id
  for update;

  if v_created_at is null or (v_interaction.created_at, v_interaction.id) > (v_created_at, v_interaction_id) then
    update public.interaction_cursors set
      last_consumed_created_at = v_interaction.created_at,
      last_consumed_interaction_id = v_interaction.id,
      updated_at = now()
    where user_id = auth.uid() and couple_id = v_couple_id;
  end if;
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;

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

create or replace function public.deactivate_device(p_device_fingerprint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices
  set is_active = false, updated_at = now()
  where user_id = auth.uid() and device_fingerprint = p_device_fingerprint;
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
  insert into public.user_notification_settings(user_id, push_enabled)
  values (auth.uid(), p_enabled)
  on conflict (user_id) do update set push_enabled = excluded.push_enabled, updated_at = now();

  if p_enabled = false then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Push disabled by receiver'
    from public.interactions i
    where nd.interaction_id = i.id
      and i.receiver_id = auth.uid()
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
  insert into public.user_action_settings(user_id, action_type, enabled)
  values (auth.uid(), p_action_type, p_enabled)
  on conflict (user_id, action_type) do update set enabled = excluded.enabled, updated_at = now();

  if p_enabled = false then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Action disabled by receiver'
    from public.interactions i
    where nd.interaction_id = i.id
      and i.receiver_id = auth.uid()
      and i.action_type = p_action_type
      and nd.status in ('pending', 'processing');
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
    where nd.interaction_id = i.id
      and i.receiver_id = auth.uid()
      and i.action_type = p_action_type
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
  where nd.interaction_id = i.id and i.couple_id = v_couple_id and nd.status in ('pending', 'processing');
end;
$$;

create or replace function public.deactivate_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set account_status = 'deactivated', deactivated_at = now()
  where id = auth.uid();
  update public.devices set is_active = false where user_id = auth.uid();
  update public.notification_deliveries nd
  set status = 'suppressed', last_error = 'Account deactivated'
  from public.interactions i
  where nd.interaction_id = i.id
    and (i.sender_id = auth.uid() or i.receiver_id = auth.uid())
    and nd.status in ('pending', 'processing');
end;
$$;

create or replace function public.reactivate_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and account_status = 'deletion_pending'
  ) then
    raise exception 'Account deletion is pending';
  end if;
  update public.profiles set account_status = 'active', deactivated_at = null
  where id = auth.uid() and account_status = 'deactivated';
end;
$$;

create or replace function public.prepare_hard_delete(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  if p_user_id is null then raise exception 'User id required'; end if;
  insert into public.account_deletion_requests(user_id, status, next_attempt_at)
  values (p_user_id, 'pending', now())
  on conflict (user_id) do update set
    status = 'pending', next_attempt_at = now(), claimed_at = null,
    lease_id = null, last_error = null, updated_at = now();
  v_couple_id := private.get_active_couple_id(p_user_id);
  if v_couple_id is not null then
    update public.couples set status = 'ended', ended_at = now(), ended_by = p_user_id, purge_after = now()
    where id = v_couple_id;
    delete from public.active_couple_memberships where couple_id = v_couple_id;
  end if;
  update public.profiles
  set account_status = 'deletion_pending', deactivated_at = now()
  where id = p_user_id;
  update public.devices set is_active = false where user_id = p_user_id;
end;
$$;

create or replace function public.claim_account_deletion_requests(p_limit integer default 20)
returns table (user_id uuid, lease_id uuid, attempt_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_deletion_requests r
  set status = case when r.attempt_count >= 10 then 'failed' else 'pending' end,
    claimed_at = null, lease_id = null,
    last_error = 'Recovered stale deletion lease'
  where r.status = 'processing' and r.claimed_at < now() - interval '5 minutes';

  return query
  with claimed as (
    select r.user_id
    from public.account_deletion_requests r
    where r.status = 'pending' and r.next_attempt_at <= now() and r.attempt_count < 10
    order by r.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  ), updated as (
    update public.account_deletion_requests r
    set status = 'processing', attempt_count = r.attempt_count + 1,
      claimed_at = now(), lease_id = gen_random_uuid(), updated_at = now()
    from claimed
    where r.user_id = claimed.user_id
    returning r.user_id, r.lease_id, r.attempt_count
  )
  select updated.user_id, updated.lease_id, updated.attempt_count from updated;
end;
$$;

create or replace function public.fail_account_deletion_request(
  p_user_id uuid,
  p_lease_id uuid,
  p_last_error text,
  p_retry_after_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_deletion_requests
  set status = case when attempt_count >= 10 then 'failed' else 'pending' end,
    next_attempt_at = now() + make_interval(secs => greatest(30, p_retry_after_seconds)),
    claimed_at = null, lease_id = null, last_error = p_last_error, updated_at = now()
  where user_id = p_user_id and status = 'processing' and lease_id = p_lease_id;
end;
$$;

create or replace function public.claim_notification_deliveries(p_limit integer default 50)
returns table (
  delivery_id uuid,
  lease_id uuid,
  device_id uuid,
  expo_push_token text,
  interaction_id uuid,
  couple_id uuid,
  sender_name text,
  receiver_locale text,
  content_mode public.notification_content_mode,
  action_type public.action_type,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_deliveries nd
  set status = case
    when nd.attempt_count >= 5 then 'failed'::public.delivery_status
    else 'pending'::public.delivery_status
  end,
    claimed_at = null, lease_id = null, last_error = 'Recovered stale processing lease'
  where nd.status = 'processing' and nd.claimed_at < now() - interval '5 minutes';

  update public.notification_deliveries nd
  set status = 'suppressed', last_error = 'Delivery no longer allowed'
  from public.interactions i, public.couples c, public.profiles sp,
    public.profiles rp, public.devices d
  where nd.interaction_id = i.id
    and c.id = i.couple_id
    and sp.id = i.sender_id
    and rp.id = i.receiver_id
    and d.id = nd.device_id
    and nd.status = 'pending'
    and (
      c.status <> 'active'
      or sp.account_status <> 'active'
      or rp.account_status <> 'active'
      or d.is_active = false
      or exists (
        select 1 from public.user_notification_settings ns
        where ns.user_id = i.receiver_id and ns.push_enabled = false
      )
      or exists (
        select 1 from public.user_action_settings action_setting
        where action_setting.user_id = i.receiver_id
          and action_setting.action_type = i.action_type
          and (action_setting.enabled = false or action_setting.push_enabled = false)
      )
    );

  return query
  with claimed as (
    select nd.id
    from public.notification_deliveries nd
    where nd.status = 'pending' and nd.next_attempt_at <= now() and nd.attempt_count < 5
    order by nd.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  ), updated as (
    update public.notification_deliveries nd
    set status = 'processing', attempt_count = nd.attempt_count + 1,
      claimed_at = now(), lease_id = gen_random_uuid(), updated_at = now()
    from claimed
    where nd.id = claimed.id
    returning nd.*
  )
  select
    u.id,
    u.lease_id,
    u.device_id,
    d.expo_push_token,
    i.id,
    i.couple_id,
    sp.display_name,
    rp.locale,
    coalesce(ns.content_mode, 'generic'),
    i.action_type,
    u.attempt_count
  from updated u
  join public.interactions i on i.id = u.interaction_id
  join public.devices d on d.id = u.device_id
  join public.profiles sp on sp.id = i.sender_id
  join public.profiles rp on rp.id = i.receiver_id
  left join public.user_notification_settings ns on ns.user_id = i.receiver_id;
end;
$$;

create or replace function public.validate_claimed_notification_delivery(
  p_delivery_id uuid,
  p_lease_id uuid
)
returns table (
  delivery_id uuid,
  lease_id uuid,
  device_id uuid,
  expo_push_token text,
  interaction_id uuid,
  couple_id uuid,
  sender_name text,
  receiver_locale text,
  content_mode public.notification_content_mode,
  action_type public.action_type,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    nd.id,
    nd.lease_id,
    nd.device_id,
    d.expo_push_token,
    i.id,
    i.couple_id,
    sp.display_name,
    rp.locale,
    coalesce(ns.content_mode, 'generic'),
    i.action_type,
    nd.attempt_count
  from public.notification_deliveries nd
  join public.interactions i on i.id = nd.interaction_id
  join public.couples c on c.id = i.couple_id
  join public.profiles sp on sp.id = i.sender_id
  join public.profiles rp on rp.id = i.receiver_id
  join public.devices d on d.id = nd.device_id
  left join public.user_notification_settings ns on ns.user_id = i.receiver_id
  left join public.user_action_settings action_setting
    on action_setting.user_id = i.receiver_id and action_setting.action_type = i.action_type
  where nd.id = p_delivery_id
    and nd.status = 'processing'
    and nd.lease_id = p_lease_id
    and c.status = 'active'
    and sp.account_status = 'active'
    and rp.account_status = 'active'
    and d.is_active = true
    and coalesce(ns.push_enabled, true) = true
    and coalesce(action_setting.enabled, true) = true
    and coalesce(action_setting.push_enabled, true) = true;

  if not found then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Delivery became ineligible before send', updated_at = now()
    where nd.id = p_delivery_id and nd.status = 'processing' and nd.lease_id = p_lease_id;
  end if;
end;
$$;

create or replace function public.complete_notification_delivery(
  p_delivery_id uuid,
  p_lease_id uuid,
  p_status public.delivery_status,
  p_provider_ticket_id text default null,
  p_last_error text default null,
  p_retry_after_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_deliveries set
    status = p_status,
    provider_ticket_id = p_provider_ticket_id,
    last_error = p_last_error,
    claimed_at = null,
    lease_id = null,
    ticketed_at = case when p_status = 'ticketed' then now() else ticketed_at end,
    next_receipt_check_at = case
      when p_status = 'ticketed' then now() + make_interval(secs => coalesce(p_retry_after_seconds, 900))
      else next_receipt_check_at
    end,
    next_attempt_at = case
      when p_status = 'pending' then now() + make_interval(secs => coalesce(p_retry_after_seconds, 60))
      else next_attempt_at
    end,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    updated_at = now()
  where id = p_delivery_id and status = 'processing' and lease_id = p_lease_id;
end;
$$;

create or replace function public.complete_notification_receipt(
  p_delivery_id uuid,
  p_status public.delivery_status,
  p_last_error text default null,
  p_retry_after_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_deliveries set
    status = case when p_status = 'pending' and attempt_count >= 5 then 'failed' else p_status end,
    provider_ticket_id = case
      when p_status = 'pending' and attempt_count < 5 then null else provider_ticket_id
    end,
    ticketed_at = case
      when p_status = 'pending' and attempt_count < 5 then null else ticketed_at
    end,
    next_receipt_check_at = case
      when p_status = 'ticketed' then now() + make_interval(secs => coalesce(p_retry_after_seconds, 900))
      when p_status = 'pending' and attempt_count < 5 then null
      else next_receipt_check_at
    end,
    next_attempt_at = case
      when p_status = 'pending' and attempt_count < 5
        then now() + make_interval(secs => coalesce(p_retry_after_seconds, 60))
      else next_attempt_at
    end,
    last_error = p_last_error,
    receipt_attempt_count = receipt_attempt_count + 1,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    updated_at = now()
  where id = p_delivery_id and status = 'ticketed';
end;
$$;

create or replace function public.cleanup_ended_couple_interactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.interactions i
  using public.couples c
  where i.couple_id = c.id and c.status = 'ended' and c.purge_after <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.avatar_states enable row level security;
alter table public.pairing_invitations enable row level security;
alter table public.pairing_attempts enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.active_couple_memberships enable row level security;
alter table public.interactions enable row level security;
alter table public.interaction_cursors enable row level security;
alter table public.devices enable row level security;
alter table public.user_action_settings enable row level security;
alter table public.user_notification_settings enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy profiles_own_select on public.profiles for select to authenticated
using (id = auth.uid());
create policy profiles_own_insert on public.profiles for insert to authenticated
with check (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy avatars_own_select on public.avatars for select to authenticated
using (user_id = auth.uid());
create policy avatars_own_insert on public.avatars for insert to authenticated
with check (user_id = auth.uid());
create policy avatars_own_update on public.avatars for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy avatar_states_select on public.avatar_states for select to authenticated
using (user_id = auth.uid() or private.is_active_partner(user_id));
create policy avatar_states_own_insert on public.avatar_states for insert to authenticated
with check (user_id = auth.uid());
create policy avatar_states_own_update on public.avatar_states for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy invitations_own_select on public.pairing_invitations for select to authenticated
using (created_by = auth.uid());
create policy couples_member_select on public.couples for select to authenticated
using (private.is_current_user_couple_member(id));
create policy couple_members_related_select on public.couple_members for select to authenticated
using (private.is_current_user_couple_member(couple_id));
create policy active_membership_own_select on public.active_couple_memberships for select to authenticated
using (user_id = auth.uid());
create policy interactions_participant_select on public.interactions for select to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy devices_own_select on public.devices for select to authenticated
using (user_id = auth.uid());
create policy action_settings_own_select on public.user_action_settings for select to authenticated
using (user_id = auth.uid());
create policy notification_settings_own_select on public.user_notification_settings for select to authenticated
using (user_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, locale) on public.profiles to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;
grant select, insert, update on public.avatars, public.avatar_states to authenticated;
grant select on public.devices, public.user_action_settings, public.user_notification_settings to authenticated;
grant select on public.couples, public.couple_members, public.active_couple_memberships,
  public.interactions, public.pairing_invitations to authenticated;

grant usage on schema private to authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_partner(uuid) to authenticated;
grant execute on function private.is_current_user_couple_member(uuid) to authenticated;

revoke all on function public.update_current_mood(public.mood_type) from public, anon;
revoke all on function public.create_pairing_invitation() from public, anon;
revoke all on function public.preview_pairing_invitation(text) from public, anon;
revoke all on function public.redeem_pairing_invitation(uuid, text) from public, anon;
revoke all on function public.get_active_couple_state() from public, anon;
revoke all on function public.send_interaction(public.target_type, public.target_region, public.gesture_type, uuid, timestamptz) from public, anon;
revoke all on function public.peek_latest_interaction() from public, anon;
revoke all on function public.acknowledge_interaction(uuid) from public, anon;
revoke all on function public.register_device(text, text, public.device_platform) from public, anon;
revoke all on function public.deactivate_device(text) from public, anon;
revoke all on function public.set_notification_content_mode(public.notification_content_mode) from public, anon;
revoke all on function public.set_notification_push_enabled(boolean) from public, anon;
revoke all on function public.set_action_enabled(public.action_type, boolean) from public, anon;
revoke all on function public.set_action_push_enabled(public.action_type, boolean) from public, anon;
revoke all on function public.unmatch_current_couple() from public, anon;
revoke all on function public.deactivate_account() from public, anon;
revoke all on function public.reactivate_account() from public, anon;
revoke all on function public.prepare_hard_delete(uuid) from public, anon, authenticated;

grant execute on function public.update_current_mood(public.mood_type) to authenticated;
grant execute on function public.create_pairing_invitation() to authenticated;
grant execute on function public.preview_pairing_invitation(text) to authenticated;
grant execute on function public.redeem_pairing_invitation(uuid, text) to authenticated;
grant execute on function public.get_active_couple_state() to authenticated;
grant execute on function public.send_interaction(public.target_type, public.target_region, public.gesture_type, uuid, timestamptz) to authenticated;
grant execute on function public.peek_latest_interaction() to authenticated;
grant execute on function public.acknowledge_interaction(uuid) to authenticated;
grant execute on function public.register_device(text, text, public.device_platform) to authenticated;
grant execute on function public.deactivate_device(text) to authenticated;
grant execute on function public.set_notification_content_mode(public.notification_content_mode) to authenticated;
grant execute on function public.set_notification_push_enabled(boolean) to authenticated;
grant execute on function public.set_action_enabled(public.action_type, boolean) to authenticated;
grant execute on function public.set_action_push_enabled(public.action_type, boolean) to authenticated;
grant execute on function public.unmatch_current_couple() to authenticated;
grant execute on function public.deactivate_account() to authenticated;
grant execute on function public.reactivate_account() to authenticated;
grant execute on function public.prepare_hard_delete(uuid) to service_role;

revoke all on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
revoke all on function public.validate_claimed_notification_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_notification_delivery(uuid, uuid, public.delivery_status, text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_notification_receipt(uuid, public.delivery_status, text, integer) from public, anon, authenticated;
revoke all on function public.claim_account_deletion_requests(integer) from public, anon, authenticated;
revoke all on function public.fail_account_deletion_request(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.cleanup_ended_couple_interactions() from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer) to service_role;
grant execute on function public.validate_claimed_notification_delivery(uuid, uuid) to service_role;
grant execute on function public.complete_notification_delivery(uuid, uuid, public.delivery_status, text, text, integer) to service_role;
grant execute on function public.complete_notification_receipt(uuid, public.delivery_status, text, integer) to service_role;
grant execute on function public.claim_account_deletion_requests(integer) to service_role;
grant execute on function public.fail_account_deletion_request(uuid, uuid, text, integer) to service_role;
grant execute on function public.cleanup_ended_couple_interactions() to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interactions'
  ) then
    alter publication supabase_realtime add table public.interactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avatar_states'
  ) then
    alter publication supabase_realtime add table public.avatar_states;
  end if;
end;
$$;
