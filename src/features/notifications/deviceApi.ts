import { requireSupabase } from '@/services/supabase/client';

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
