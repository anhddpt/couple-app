import { requireSupabase } from '@/services/supabase/client';

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
  const { error } = await requireSupabase().functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
}
