import { requireSupabase } from '@/services/supabase/client';
import type { Interaction, InteractionHistoryItem } from '@/types/domain';

export type InteractionIntent = {
  targetType: 'partner' | 'self';
  targetRegion: 'head' | 'cheek' | 'body' | 'self_eyes' | 'self_mouth' | 'self_heart' | 'voice';
  gestureType: 'tap' | 'long_press' | 'drag_together';
  clientEventId: string;
  clientCreatedAt: string;
};

function first<T>(data: T | T[]) {
  return Array.isArray(data) ? data[0] : data;
}

export async function sendInteraction(intent: InteractionIntent): Promise<Interaction> {
  const { data, error } = await requireSupabase().rpc('send_interaction', {
    p_target_type: intent.targetType,
    p_target_region: intent.targetRegion,
    p_gesture_type: intent.gestureType,
    p_client_event_id: intent.clientEventId,
    p_client_created_at: intent.clientCreatedAt,
  });
  if (error) throw error;
  const interaction = first(data as Interaction | Interaction[]);
  if (!interaction) throw new Error('Interaction was not created');
  return interaction;
}

export async function peekLatestInteraction(): Promise<Interaction | null> {
  const { data, error } = await requireSupabase().rpc('peek_latest_interaction');
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return first(data as Interaction | Interaction[]) ?? null;
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
