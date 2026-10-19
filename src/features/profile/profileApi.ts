import type { User } from '@supabase/supabase-js';

import { requireSupabase } from '@/services/supabase/client';
import type { Avatar, AvatarConfig, AvatarPreset, AvatarState, CoupleSummary, Mood, Profile } from '@/types/domain';

function first<T>(data: T | T[]) {
  return Array.isArray(data) ? data[0] : data;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, display_name, account_status, deactivated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(user: User, displayName: string) {
  const { error } = await requireSupabase().from('profiles').upsert({
    id: user.id,
    display_name: displayName.trim(),
    locale: 'vi',
  });
  if (error) throw error;
}

export async function getAvatar(userId: string): Promise<Avatar | null> {
  const { data, error } = await requireSupabase()
    .from('avatars')
    .select('user_id, preset_id, config, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Avatar | null;
}

export async function saveAvatar(userId: string, presetId: AvatarPreset, config: AvatarConfig) {
  const { error } = await requireSupabase().from('avatars').upsert({
    user_id: userId,
    preset_id: presetId,
    config,
  });
  if (error) throw error;
}

export async function getAvatarState(userId: string): Promise<AvatarState | null> {
  const { data, error } = await requireSupabase()
    .from('avatar_states')
    .select('user_id, current_mood, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as AvatarState | null;
}

export async function updateMood(mood: Mood) {
  const { error } = await requireSupabase().rpc('update_current_mood', { p_mood: mood });
  if (error) throw error;
}

export async function getActiveCoupleState(): Promise<CoupleSummary | null> {
  const { data, error } = await requireSupabase().rpc('get_active_couple_state');
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return first(data as CoupleSummary | CoupleSummary[]) ?? null;
}
