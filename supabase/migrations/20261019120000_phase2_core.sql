alter table public.avatars
  add column if not exists config jsonb not null default jsonb_build_object(
    'version', 2,
    'skin', 'skin_peach',
    'hair', 'hair_chocolate',
    'eyes', 'eyes_round',
    'mouth', 'mouth_smile',
    'outfit', 'outfit_coral',
    'accessory', null
  );

alter table public.user_notification_settings
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_start time not null default '22:00',
  add column if not exists quiet_end time not null default '07:00',
  add column if not exists timezone text not null default 'Asia/Ho_Chi_Minh';

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
  if p_target_type = 'partner' and p_target_region = 'cheek' and p_gesture_type = 'tap' then
    return 'CHEEK_POKE'::public.action_type;
  end if;
  if p_target_type = 'partner' and p_target_region = 'cheek' and p_gesture_type = 'long_press' then
    return 'KISS'::public.action_type;
  end if;
  if p_target_type = 'partner' and p_target_region = 'body' and p_gesture_type = 'drag_together' then
    return 'HUG'::public.action_type;
  end if;
  if p_target_type = 'self' and p_target_region = 'self_eyes' and p_gesture_type = 'tap' then
    return 'SLEEPY'::public.action_type;
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

create or replace function private.is_in_quiet_hours(p_user_id uuid, p_at timestamptz default now())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_setting public.user_notification_settings%rowtype;
  v_local_time time;
begin
  select * into v_setting from public.user_notification_settings where user_id = p_user_id;
  if v_setting.user_id is null or not v_setting.quiet_hours_enabled then return false; end if;
  v_local_time := (p_at at time zone v_setting.timezone)::time;
  if v_setting.quiet_start = v_setting.quiet_end then return true; end if;
  if v_setting.quiet_start < v_setting.quiet_end then
    return v_local_time >= v_setting.quiet_start and v_local_time < v_setting.quiet_end;
  end if;
  return v_local_time >= v_setting.quiet_start or v_local_time < v_setting.quiet_end;
exception when invalid_parameter_value then
  return false;
end;
$$;

drop function if exists public.get_active_couple_state();
create function public.get_active_couple_state()
returns table (
  couple_id uuid,
  paired_at timestamptz,
  partner_id uuid,
  partner_name text,
  partner_avatar_preset text,
  partner_avatar_config jsonb,
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
    case when pp.account_status = 'active' then coalesce(a.config, '{}'::jsonb) else '{}'::jsonb end,
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

grant execute on function public.get_active_couple_state() to authenticated;

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
  if auth.uid() is null then raise exception 'Authentication required'; end if;
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
    where nd.interaction_id = i.id
      and i.receiver_id = auth.uid()
      and nd.status in ('pending', 'processing');
  end if;
end;
$$;

create or replace function public.list_interaction_history(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  couple_id uuid,
  sender_id uuid,
  receiver_id uuid,
  action_type public.action_type,
  actor_mood public.mood_type,
  target_type public.target_type,
  target_region public.target_region,
  gesture_type public.gesture_type,
  created_at timestamptz,
  sender_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.couple_id, i.sender_id, i.receiver_id, i.action_type, i.actor_mood,
    i.target_type, i.target_region, i.gesture_type, i.created_at, p.display_name
  from public.interactions i
  join public.profiles p on p.id = i.sender_id
  join public.active_couple_memberships acm on acm.couple_id = i.couple_id and acm.user_id = auth.uid()
  where auth.uid() is not null
    and (p_before_created_at is null or (i.created_at, i.id) < (p_before_created_at, p_before_id))
  order by i.created_at desc, i.id desc
  limit greatest(1, least(p_limit, 50));
$$;

revoke all on function public.set_quiet_hours(boolean, time, time, text) from public, anon;
revoke all on function public.list_interaction_history(timestamptz, uuid, integer) from public, anon;
grant execute on function public.set_quiet_hours(boolean, time, time, text) to authenticated;
grant execute on function public.list_interaction_history(timestamptz, uuid, integer) to authenticated;

-- Recreate interaction dispatch so quiet hours can suppress push without blocking realtime.
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
  v_quiet boolean;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;
  select i.* into v_interaction from public.interactions i
  where i.sender_id = v_sender and i.client_event_id = p_client_event_id;
  if v_interaction.id is not null then return next v_interaction; return; end if;
  if not private.is_active_user(v_sender) then raise exception 'Active account required'; end if;

  select acm.couple_id into v_couple_id from public.active_couple_memberships acm
  where acm.user_id = v_sender;
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  perform 1 from public.couples where id = v_couple_id and status = 'active' for update;
  if not found then raise exception 'Active couple required'; end if;
  select cm.user_id into v_receiver from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_sender;
  if v_receiver is null or not private.is_active_user(v_receiver) then raise exception 'Partner unavailable'; end if;

  select current_mood into v_mood from public.avatar_states where user_id = v_sender;
  v_mood := coalesce(v_mood, 'happy');
  v_action := private.resolve_action(v_mood, p_target_type, p_target_region, p_gesture_type);
  if exists (select 1 from public.user_action_settings
    where user_id = v_receiver and action_type = v_action and enabled = false) then
    raise exception 'Action unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_sender::text || ':' || v_receiver::text || ':' || v_action::text, 0));
  if (select count(*) from public.interactions where sender_id = v_sender and receiver_id = v_receiver
    and action_type = v_action and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Action rate limit exceeded';
  end if;

  insert into public.interactions(
    couple_id, sender_id, receiver_id, action_type, actor_mood,
    target_type, target_region, gesture_type, client_event_id, client_created_at
  ) values (
    v_couple_id, v_sender, v_receiver, v_action, v_mood,
    p_target_type, p_target_region, p_gesture_type, p_client_event_id, p_client_created_at
  ) on conflict (sender_id, client_event_id) do nothing returning * into v_interaction;
  if v_interaction.id is null then
    select i.* into v_interaction from public.interactions i
    where i.sender_id = v_sender and i.client_event_id = p_client_event_id;
    return next v_interaction; return;
  end if;

  select coalesce(ns.push_enabled, true) and coalesce(a.push_enabled, true)
  into v_push_enabled from (select 1) seed
  left join public.user_notification_settings ns on ns.user_id = v_receiver
  left join public.user_action_settings a on a.user_id = v_receiver and a.action_type = v_action;
  v_quiet := private.is_in_quiet_hours(v_receiver);
  insert into public.notification_deliveries(interaction_id, device_id, status, last_error)
  select v_interaction.id, d.id,
    case when coalesce(v_push_enabled, true) and not v_quiet then 'pending'::public.delivery_status
      else 'suppressed'::public.delivery_status end,
    case when not coalesce(v_push_enabled, true) then 'Push disabled by receiver'
      when v_quiet then 'Quiet hours' else null end
  from public.devices d where d.user_id = v_receiver and d.is_active = true
  on conflict (interaction_id, device_id) do nothing;

  return next v_interaction;
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
  select nd.id, nd.lease_id, nd.device_id, d.expo_push_token, i.id, i.couple_id,
    sp.display_name, rp.locale, coalesce(ns.content_mode, 'generic'), i.action_type, nd.attempt_count
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
    and coalesce(action_setting.push_enabled, true) = true
    and not private.is_in_quiet_hours(i.receiver_id);

  if not found then
    update public.notification_deliveries nd
    set status = 'suppressed', claimed_at = null, lease_id = null,
      last_error = 'Delivery became ineligible before send', updated_at = now()
    where nd.id = p_delivery_id and nd.status = 'processing' and nd.lease_id = p_lease_id;
  end if;
end;
$$;
