import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'Authorization required' }, 401);

  const userClient = createUserClient(authorization);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401);

  const { error: prepareError } = await createServiceClient().rpc('prepare_hard_delete', {
    p_user_id: userData.user.id,
  });
  if (prepareError) return jsonResponse({ error: prepareError.message }, 500);

  return jsonResponse({ deletionQueued: true }, 202);
});
