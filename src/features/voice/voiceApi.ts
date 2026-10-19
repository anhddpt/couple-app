import { requireSupabase } from '@/services/supabase/client';
import type { Interaction } from '@/types/domain';

type VoiceReservation = {
  reservation_id: string;
  storage_path: string;
};

function unwrap<T>(data: T | T[]) {
  return Array.isArray(data) ? data[0] : data;
}

export async function reserveVoiceUpload() {
  const { data, error } = await requireSupabase().rpc('reserve_voice_upload');
  if (error) throw error;
  const reservation = unwrap(data as VoiceReservation | VoiceReservation[]);
  if (!reservation) throw new Error('Voice upload reservation unavailable');
  return reservation;
}

export async function uploadVoiceClip(storagePath: string, uri: string) {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const { error } = await requireSupabase().storage.from('voice-clips').upload(storagePath, bytes, {
    contentType: 'audio/mp4',
    upsert: false,
  });
  if (error) throw error;
}

export async function sendVoiceAction(params: {
  reservationId: string;
  durationMs: number;
  clientEventId: string;
}): Promise<Interaction> {
  const { data, error } = await requireSupabase().rpc('send_voice_action', {
    p_reservation_id: params.reservationId,
    p_duration_ms: params.durationMs,
    p_client_event_id: params.clientEventId,
    p_client_created_at: new Date().toISOString(),
  });
  if (error) throw error;
  const interaction = unwrap(data as Interaction | Interaction[]);
  if (!interaction) throw new Error('Voice interaction was not created');
  return interaction;
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
