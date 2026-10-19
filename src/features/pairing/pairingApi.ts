import { requireSupabase } from '@/services/supabase/client';
import type { AvatarPreset } from '@/types/domain';

export type PairingPreview = {
  invitation_id: string;
  inviter_name: string;
  inviter_avatar_preset: AvatarPreset;
};

function first<T>(data: T | T[]) {
  return Array.isArray(data) ? data[0] : data;
}

export async function createPairingInvitation(): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_pairing_invitation');
  if (error) throw error;
  return String(data);
}

export async function previewPairingInvitation(code: string): Promise<PairingPreview | null> {
  const { data, error } = await requireSupabase().rpc('preview_pairing_invitation', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return first(data as PairingPreview | PairingPreview[]) ?? null;
}

export async function redeemPairingInvitation(invitationId: string, code: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('redeem_pairing_invitation', {
    p_invitation_id: invitationId,
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return String(data);
}
