import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const workerSecret = Deno.env.get('WORKER_SECRET') ?? '';
  if (!workerSecret || request.headers.get('X-Worker-Secret') !== workerSecret) {
    return jsonResponse({ error: 'Worker authorization required' }, 401);
  }

  const { data, error } = await createServiceClient().rpc('cleanup_ended_couple_interactions');
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ deletedInteractions: data ?? 0 });
});
