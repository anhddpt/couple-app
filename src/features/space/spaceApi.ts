import { requireSupabase } from '@/services/supabase/client';
import type { CoupleOutfit, CoupleSpace, PetType, RoomTheme } from '@/types/domain';

function unwrap(data: CoupleSpace | CoupleSpace[]) {
  return Array.isArray(data) ? data[0] : data;
}

export async function getCoupleSpace(): Promise<CoupleSpace> {
  const { data, error } = await requireSupabase().rpc('get_couple_space');
  if (error) throw error;
  const space = unwrap(data as CoupleSpace | CoupleSpace[]);
  if (!space) throw new Error('Shared space unavailable');
  return space;
}

export async function updateCoupleSpace(params: {
  roomTheme: RoomTheme;
  petType: PetType;
  petName: string;
  coupleOutfit: CoupleOutfit;
  expectedUpdatedAt: string;
}) {
  const { data, error } = await requireSupabase().rpc('update_couple_space', {
    p_room_theme: params.roomTheme,
    p_pet_type: params.petType,
    p_pet_name: params.petName.trim(),
    p_couple_outfit: params.coupleOutfit,
    p_expected_updated_at: params.expectedUpdatedAt,
  });
  if (error) throw error;
  const space = unwrap(data as CoupleSpace | CoupleSpace[]);
  if (!space) throw new Error('Shared space unavailable');
  return space;
}

export async function careForPet() {
  const { data, error } = await requireSupabase().rpc('care_for_pet');
  if (error) throw error;
  const space = unwrap(data as CoupleSpace | CoupleSpace[]);
  if (!space) throw new Error('Shared space unavailable');
  return space;
}
