import { requireSupabase } from '@/services/supabase/client';

export async function generatePostcard(occasion: 'anniversary' | 'miss_you' | 'date_night') {
  const { data, error } = await requireSupabase().functions.invoke('generate-postcard', {
    method: 'POST',
    body: { occasion },
  });
  if (error) throw error;
  if (!data?.imageBase64) throw new Error(data?.error ?? 'Image generation failed');
  return `data:image/png;base64,${data.imageBase64}`;
}
