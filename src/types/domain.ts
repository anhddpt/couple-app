export const moods = ['happy', 'angry', 'sad'] as const;
export type Mood = (typeof moods)[number];

export const actionTypes = [
  'HEAD_PAT',
  'BONK',
  'PUSH_AWAY',
  'HUG',
  'HUNGRY',
  'MISS_YOU',
  'CHEEK_POKE',
  'KISS',
  'SLEEPY',
] as const;
export type ActionType = (typeof actionTypes)[number];

export type NotificationContentMode = 'generic' | 'sender_only' | 'detailed';

export type Profile = {
  id: string;
  display_name: string;
  account_status: 'active' | 'deactivated' | 'deletion_pending';
  deactivated_at: string | null;
};

export type AvatarPreset = 'coral' | 'sunny' | 'mint';

export type AvatarConfig = {
  version: 2;
  skin: string;
  hair: string;
  eyes: string;
  mouth: string;
  outfit: string;
  accessory: string | null;
};

export type Avatar = {
  user_id: string;
  preset_id: AvatarPreset;
  config: AvatarConfig;
  updated_at: string;
};

export type AvatarState = {
  user_id: string;
  current_mood: Mood;
  updated_at: string;
};

export type CoupleSummary = {
  couple_id: string;
  paired_at: string;
  partner_id: string;
  partner_name: string;
  partner_avatar_preset: AvatarPreset;
  partner_avatar_config: AvatarConfig;
  partner_mood: Mood;
  partner_available: boolean;
};

export type Interaction = {
  id: string;
  couple_id: string;
  sender_id: string;
  receiver_id: string;
  action_type: ActionType;
  actor_mood: Mood;
  target_type: 'partner' | 'self';
  target_region: 'head' | 'cheek' | 'body' | 'self_eyes' | 'self_mouth' | 'self_heart';
  gesture_type: 'tap' | 'long_press' | 'drag_together';
  created_at: string;
};

export type InteractionHistoryItem = Interaction & {
  sender_name: string;
};

export type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};
