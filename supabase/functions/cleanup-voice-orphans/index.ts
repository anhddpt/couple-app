import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { removeStoragePaths } from '../_shared/storage.ts';
import { createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const workerSecret = Deno.env.get('WORKER_SECRET') ?? '';
  if (!workerSecret || request.headers.get('X-Worker-Secret') !== workerSecret) {
    return jsonResponse({ error: 'Worker authorization required' }, 401);
  }

  const supabase = createServiceClient();
  try {
    const { data, error: claimError } = await supabase.rpc('claim_expired_voice_uploads', {
      p_limit: 500,
    });
    if (claimError) throw claimError;
    const claims = (data ?? []) as { storage_path: string; cleanup_token: string }[];
    const paths = claims.map((item) => item.storage_path);
    await removeStoragePaths(supabase, paths);
    const cleanupToken = claims[0]?.cleanup_token;
    let deletedReservations = 0;
    if (cleanupToken) {
      const { data: deleted, error: completeError } = await supabase.rpc(
        'complete_expired_voice_upload_cleanup',
        { p_cleanup_token: cleanupToken },
      );
      if (completeError) throw completeError;
      deletedReservations = Number(deleted ?? 0);
    }
    return jsonResponse({ removedObjects: paths.length, deletedReservations });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Orphan cleanup failed' }, 500);
  }
});
