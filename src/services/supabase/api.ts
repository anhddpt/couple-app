import type { User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import type {
  Avatar,
  AvatarConfig,
  AvatarPreset,
  AvatarState,
  CoupleSummary,
  CoupleOutfit,
  CoupleSpace,
  Interaction,
  InteractionHistoryItem,
  Mood,
  NotificationContentMode,
  Profile,
  QuietHours,
  PetType,
  RoomTheme,
} from '@/types/domain';

import { requireSupabase } from './client';

function unwrap<T>(data: unknown): T {
  if (Array.isArray(data)) {
    return data[0] as T;
  }

  return data as T;
}

export async function sendOtp(email: string) {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });

  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error) throw error;
  return data.session;
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
  return unwrap<CoupleSummary>(data);
}

export async function createPairingInvitation(): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_pairing_invitation');
  if (error) throw error;
  return String(data);
}

export type PairingPreview = {
  invitation_id: string;
  inviter_name: string;
  inviter_avatar_preset: AvatarPreset;
};

export async function previewPairingInvitation(code: string): Promise<PairingPreview | null> {
  const { data, error } = await requireSupabase().rpc('preview_pairing_invitation', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return unwrap<PairingPreview>(data);
}

export async function redeemPairingInvitation(
  invitationId: string,
  code: string,
): Promise<string> {
  const { data, error } = await requireSupabase().rpc('redeem_pairing_invitation', {
    p_invitation_id: invitationId,
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return String(data);
}

type InteractionIntent = {
  targetType: 'partner' | 'self';
  targetRegion: 'head' | 'cheek' | 'body' | 'self_eyes' | 'self_mouth' | 'self_heart' | 'voice';
  gestureType: 'tap' | 'long_press' | 'drag_together';
  clientEventId: string;
  clientCreatedAt: string;
};

export async function sendInteraction(intent: InteractionIntent): Promise<Interaction> {
  const { data, error } = await requireSupabase().rpc('send_interaction', {
    p_target_type: intent.targetType,
    p_target_region: intent.targetRegion,
    p_gesture_type: intent.gestureType,
    p_client_event_id: intent.clientEventId,
    p_client_created_at: intent.clientCreatedAt,
  });

  if (error) throw error;
  return unwrap<Interaction>(data);
}

export async function peekLatestInteraction(): Promise<Interaction | null> {
  const { data, error } = await requireSupabase().rpc('peek_latest_interaction');
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return unwrap<Interaction>(data);
}

export async function acknowledgeInteraction(interactionId: string) {
  const { error } = await requireSupabase().rpc('acknowledge_interaction', {
    p_interaction_id: interactionId,
  });
  if (error) throw error;
}

export async function getInteractionHistory(
  cursor?: { createdAt: string; id: string },
  limit = 20,
): Promise<InteractionHistoryItem[]> {
  const { data, error } = await requireSupabase().rpc('list_interaction_history', {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as InteractionHistoryItem[];
}

export async function getCoupleSpace(): Promise<CoupleSpace> {
  const { data, error } = await requireSupabase().rpc('get_couple_space');
  if (error) throw error;
  return unwrap<CoupleSpace>(data);
}

export async function updateCoupleSpace(params: {
  roomTheme: RoomTheme;
  petType: PetType;
  petName: string;
  coupleOutfit: CoupleOutfit;
}) {
  const { data, error } = await requireSupabase().rpc('update_couple_space', {
    p_room_theme: params.roomTheme,
    p_pet_type: params.petType,
    p_pet_name: params.petName.trim(),
    p_couple_outfit: params.coupleOutfit,
  });
  if (error) throw error;
  return unwrap<CoupleSpace>(data);
}

export async function careForPet() {
  const { data, error } = await requireSupabase().rpc('care_for_pet');
  if (error) throw error;
  return unwrap<CoupleSpace>(data);
}

export async function uploadVoiceClip(userId: string, uri: string, extension = 'm4a') {
  const path = `${userId}/${Crypto.randomUUID()}.${extension}`;
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const { error } = await requireSupabase().storage.from('voice-clips').upload(path, bytes, {
    contentType: 'audio/mp4',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteUploadedVoiceClip(storagePath: string) {
  const { error } = await requireSupabase().storage.from('voice-clips').remove([storagePath]);
  if (error) throw error;
}

export async function sendVoiceAction(params: {
  storagePath: string;
  durationMs: number;
  clientEventId: string;
}) {
  const { data, error } = await requireSupabase().rpc('send_voice_action', {
    p_storage_path: params.storagePath,
    p_duration_ms: params.durationMs,
    p_client_event_id: params.clientEventId,
    p_client_created_at: new Date().toISOString(),
  });
  if (error) throw error;
  return unwrap<Interaction>(data);
}

export async function getVoiceClipUrl(interactionId: string) {
  const { data, error } = await requireSupabase()
    .from('voice_clips')
    .select('storage_path')
    .eq('interaction_id', interactionId)
    .single();
  if (error) throw error;
  const { data: signed, error: signedError } = await requireSupabase()
    .storage
    .from('voice-clips')
    .createSignedUrl(data.storage_path, 300);
  if (signedError) throw signedError;
  return signed.signedUrl;
}

export async function generatePostcard(occasion: 'anniversary' | 'miss_you' | 'date_night') {
  const { data, error } = await requireSupabase().functions.invoke('generate-postcard', {
    method: 'POST',
    body: { occasion },
  });
  if (error) throw error;
  if (!data?.imageBase64) throw new Error(data?.error ?? 'Image generation failed');
  return `data:image/png;base64,${data.imageBase64}`;
}

export async function registerDevice(params: {
  expoPushToken: string;
  deviceFingerprint: string;
  platform: 'android' | 'ios';
}) {
  const { error } = await requireSupabase().rpc('register_device', {
    p_expo_push_token: params.expoPushToken,
    p_device_fingerprint: params.deviceFingerprint,
    p_platform: params.platform,
  });
  if (error) throw error;
}

export async function deactivateDevice(deviceFingerprint: string) {
  const { error } = await requireSupabase().rpc('deactivate_device', {
    p_device_fingerprint: deviceFingerprint,
  });
  if (error) throw error;
}

export async function setNotificationContentMode(contentMode: NotificationContentMode) {
  const { error } = await requireSupabase().rpc('set_notification_content_mode', {
    p_content_mode: contentMode,
  });
  if (error) throw error;
}

export async function getUserSettings() {
  const client = requireSupabase();
  const [{ data: notification, error: notificationError }, { data: actions, error: actionsError }] =
    await Promise.all([
      client
        .from('user_notification_settings')
        .select('push_enabled, content_mode, quiet_hours_enabled, quiet_start, quiet_end, timezone')
        .maybeSingle(),
      client.from('user_action_settings').select('action_type, enabled, push_enabled'),
    ]);

  if (notificationError) throw notificationError;
  if (actionsError) throw actionsError;
  return {
    notification: (notification ?? {
      push_enabled: true,
      content_mode: 'generic',
      quiet_hours_enabled: false,
      quiet_start: '22:00:00',
      quiet_end: '07:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
    }) as {
      push_enabled: boolean;
      content_mode: NotificationContentMode;
      quiet_hours_enabled: boolean;
      quiet_start: string;
      quiet_end: string;
      timezone: string;
    },
    actions: (actions ?? []) as {
      action_type: string;
      enabled: boolean;
      push_enabled: boolean;
    }[],
  };
}

export async function setQuietHours(quietHours: QuietHours) {
  const { error } = await requireSupabase().rpc('set_quiet_hours', {
    p_enabled: quietHours.enabled,
    p_start: quietHours.start,
    p_end: quietHours.end,
    p_timezone: quietHours.timezone,
  });
  if (error) throw error;
}

export async function setNotificationPushEnabled(enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_notification_push_enabled', {
    p_enabled: enabled,
  });
  if (error) throw error;
}

export async function setActionEnabled(actionType: string, enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_action_enabled', {
    p_action_type: actionType,
    p_enabled: enabled,
  });
  if (error) throw error;
}

export async function setActionPushEnabled(actionType: string, enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_action_push_enabled', {
    p_action_type: actionType,
    p_enabled: enabled,
  });
  if (error) throw error;
}

export async function unmatch() {
  const { error } = await requireSupabase().rpc('unmatch_current_couple');
  if (error) throw error;
}

export async function deactivateAccount() {
  const { error } = await requireSupabase().rpc('deactivate_account');
  if (error) throw error;
}

export async function reactivateAccount() {
  const { error } = await requireSupabase().rpc('reactivate_account');
  if (error) throw error;
}

export async function requestHardDelete() {
  const { error } = await requireSupabase().functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) throw error;
}
