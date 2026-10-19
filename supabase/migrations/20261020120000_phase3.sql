create table public.couple_spaces (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  room_theme text not null default 'sunset' check (room_theme in ('sunset', 'night', 'garden')),
  pet_type text not null default 'cat' check (pet_type in ('cat', 'dog', 'bunny')),
  pet_name text not null default 'Mochi' check (char_length(trim(pet_name)) between 1 and 24),
  pet_mood text not null default 'happy' check (pet_mood in ('happy', 'hungry', 'sleepy')),
  pet_xp integer not null default 0 check (pet_xp >= 0),
  couple_outfit text not null default 'classic' check (couple_outfit in ('classic', 'cozy', 'party')),
  last_cared_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.voice_clips (
  interaction_id uuid primary key references public.interactions(id) on delete cascade,
  storage_path text not null unique,
  duration_ms integer not null check (duration_ms between 250 and 10000),
  created_at timestamptz not null default now()
);

create trigger couple_spaces_touch_updated_at before update on public.couple_spaces
for each row execute function public.touch_updated_at();

alter table public.couple_spaces enable row level security;
alter table public.voice_clips enable row level security;

create policy couple_spaces_member_select on public.couple_spaces for select to authenticated
using (private.is_current_user_couple_member(couple_id));
create policy voice_clips_participant_select on public.voice_clips for select to authenticated
using (exists (
  select 1 from public.interactions i
  where i.id = interaction_id and (i.sender_id = auth.uid() or i.receiver_id = auth.uid())
));

grant select on public.couple_spaces, public.voice_clips to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('voice-clips', 'voice-clips', false, 1048576, array['audio/mp4', 'audio/m4a', 'audio/x-m4a'])
on conflict (id) do nothing;

create policy voice_clips_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'voice-clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy voice_clips_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'voice-clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy voice_clips_participant_read on storage.objects for select to authenticated
using (bucket_id = 'voice-clips' and exists (
  select 1 from public.voice_clips vc
  join public.interactions i on i.id = vc.interaction_id
  where vc.storage_path = name and (i.sender_id = auth.uid() or i.receiver_id = auth.uid())
));

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
  if p_target_type = 'partner' and p_target_region = 'cheek' and p_gesture_type = 'tap' then return 'CHEEK_POKE'; end if;
  if p_target_type = 'partner' and p_target_region = 'cheek' and p_gesture_type = 'long_press' then return 'KISS'; end if;
  if p_target_type = 'partner' and p_target_region = 'body' and p_gesture_type = 'drag_together' then return 'HUG'; end if;
  if p_target_type = 'self' and p_target_region = 'self_eyes' and p_gesture_type = 'tap' then return 'SLEEPY'; end if;
  if p_target_type = 'self' and p_target_region = 'self_mouth' and p_gesture_type = 'tap' then return 'HUNGRY'; end if;
  if p_target_type = 'self' and p_target_region = 'self_heart' and p_gesture_type = 'tap' then return 'MISS_YOU'; end if;
  if p_target_type = 'self' and p_target_region = 'voice' and p_gesture_type = 'tap' then return 'VOICE'; end if;
  raise exception 'Unsupported interaction intent';
end;
$$;

create or replace function public.get_couple_space()
returns setof public.couple_spaces
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  insert into public.couple_spaces(couple_id) values (v_couple_id)
  on conflict (couple_id) do nothing;
  update public.couple_spaces set pet_mood = case
    when last_cared_at is null or last_cared_at < now() - interval '48 hours' then 'hungry'
    when last_cared_at < now() - interval '24 hours' then 'sleepy'
    else 'happy'
  end where couple_id = v_couple_id;
  return query select * from public.couple_spaces where couple_id = v_couple_id;
end;
$$;

create or replace function public.update_couple_space(
  p_room_theme text,
  p_pet_type text,
  p_pet_name text,
  p_couple_outfit text
)
returns setof public.couple_spaces
language plpgsql
security definer
set search_path = public
as $$
declare v_couple_id uuid;
begin
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  if p_room_theme not in ('sunset', 'night', 'garden') then raise exception 'Invalid room theme'; end if;
  if p_pet_type not in ('cat', 'dog', 'bunny') then raise exception 'Invalid pet type'; end if;
  if p_couple_outfit not in ('classic', 'cozy', 'party') then raise exception 'Invalid couple outfit'; end if;
  insert into public.couple_spaces(couple_id, room_theme, pet_type, pet_name, couple_outfit)
  values (v_couple_id, p_room_theme, p_pet_type, trim(p_pet_name), p_couple_outfit)
  on conflict (couple_id) do update set room_theme = excluded.room_theme,
    pet_type = excluded.pet_type, pet_name = excluded.pet_name,
    couple_outfit = excluded.couple_outfit, updated_at = now();
  return query select * from public.couple_spaces where couple_id = v_couple_id;
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
  v_couple_id := private.get_active_couple_id(auth.uid());
  if v_couple_id is null then raise exception 'Active couple required'; end if;
  insert into public.couple_spaces(couple_id, pet_xp, last_cared_at)
  values (v_couple_id, 1, now())
  on conflict (couple_id) do update set
    pet_xp = public.couple_spaces.pet_xp + 1,
    pet_mood = 'happy', last_cared_at = now(), updated_at = now();
  return query select * from public.couple_spaces where couple_id = v_couple_id;
end;
$$;

create or replace function public.send_voice_action(
  p_storage_path text,
  p_duration_ms integer,
  p_client_event_id uuid,
  p_client_created_at timestamptz default null
)
returns setof public.interactions
language plpgsql
security definer
set search_path = public
as $$
declare v_interaction public.interactions%rowtype;
begin
  if p_duration_ms not between 250 and 10000 then raise exception 'Voice clip must be 10 seconds or less'; end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then raise exception 'Invalid voice clip path'; end if;
  select * into v_interaction from public.send_interaction(
    'self'::public.target_type, 'voice'::public.target_region, 'tap'::public.gesture_type,
    p_client_event_id, p_client_created_at
  );
  insert into public.voice_clips(interaction_id, storage_path, duration_ms)
  values (v_interaction.id, p_storage_path, p_duration_ms)
  on conflict (interaction_id) do nothing;
  return next v_interaction;
end;
$$;

revoke all on function public.get_couple_space() from public, anon;
revoke all on function public.update_couple_space(text, text, text, text) from public, anon;
revoke all on function public.care_for_pet() from public, anon;
revoke all on function public.send_voice_action(text, integer, uuid, timestamptz) from public, anon;
grant execute on function public.get_couple_space() to authenticated;
grant execute on function public.update_couple_space(text, text, text, text) to authenticated;
grant execute on function public.care_for_pet() to authenticated;
grant execute on function public.send_voice_action(text, integer, uuid, timestamptz) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_spaces'
  ) then
    alter publication supabase_realtime add table public.couple_spaces;
  end if;
end;
$$;
