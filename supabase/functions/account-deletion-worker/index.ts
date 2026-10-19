import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  listStoragePrefixPaths,
  readAllStoragePaths,
  removeStoragePaths,
} from '../_shared/storage.ts';
import { createServiceClient } from '../_shared/supabase.ts';

type DeletionJob = {
  user_id: string;
  lease_id: string;
  attempt_count: number;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const workerSecret = Deno.env.get('WORKER_SECRET') ?? '';
  if (!workerSecret || request.headers.get('X-Worker-Secret') !== workerSecret) {
    return jsonResponse({ error: 'Worker authorization required' }, 401);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('claim_account_deletion_requests', { p_limit: 20 });
  if (error) return jsonResponse({ error: error.message }, 500);

  const jobs = (data ?? []) as DeletionJob[];
  const results = await Promise.all(
    jobs.map(async (job) => {
      let failure: string | null = null;
      try {
        const recordedPaths = await readAllStoragePaths(supabase, 'list_voice_paths_for_user', {
          p_user_id: job.user_id,
        });
        const prefixPaths = await listStoragePrefixPaths(supabase, job.user_id);
        await removeStoragePaths(supabase, [...new Set([...recordedPaths, ...prefixPaths])]);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(job.user_id);
        if (deleteError) throw deleteError;
      } catch (nextError) {
        failure = nextError instanceof Error ? nextError.message : 'Account deletion failed';
      }
      if (!failure) return { userId: job.user_id, status: 'deleted' };

      const { error: retryError } = await supabase.rpc('fail_account_deletion_request', {
        p_user_id: job.user_id,
        p_lease_id: job.lease_id,
        p_last_error: failure,
        p_retry_after_seconds: Math.min(3600, 60 * 2 ** job.attempt_count),
      });
      if (retryError) throw retryError;
      return { userId: job.user_id, status: 'retrying' };
    }),
  );

  return jsonResponse({ claimed: jobs.length, results });
});
