import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const occasionPrompts = {
  anniversary: 'a warm anniversary celebration with tiny flowers and a subtle heart motif',
  miss_you: 'a tender long-distance moment under the same moon, hopeful and comforting',
  date_night: 'a cozy evening date with soft lights and playful romantic details',
} as const;

type Occasion = keyof typeof occasionPrompts;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'Authorization required' }, 401);
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  if (!apiKey) return jsonResponse({ error: 'AI postcard generation is not configured' }, 503);

  const userClient = createUserClient(authorization);
  const serviceClient = createServiceClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401);

  const payload = await request.json().catch(() => ({}));
  const occasion = String(payload.occasion ?? 'anniversary') as Occasion;
  if (!(occasion in occasionPrompts)) return jsonResponse({ error: 'Invalid occasion' }, 400);

  const { data: jobId, error: claimError } = await userClient.rpc('claim_postcard_generation');
  if (claimError || !jobId) {
    return jsonResponse({ error: claimError?.message ?? 'Postcard generation unavailable' }, 429);
  }

  try {
    const [{ data: avatar }, { data: couple, error: coupleError }, { data: space }] = await Promise.all([
      userClient.from('avatars').select('config').eq('user_id', userData.user.id).maybeSingle(),
      userClient.rpc('get_active_couple_state'),
      userClient.rpc('get_couple_space'),
    ]);
    if (coupleError || !couple?.length) throw new Error('Active couple required');

    const prompt = [
      'Create a square romantic postcard illustration for a private couples app.',
      occasionPrompts[occasion],
      'Show two original cute chibi characters, not real people and not copyrighted characters.',
      `Visual hints for the first character: ${JSON.stringify(avatar?.config ?? {})}.`,
      `Visual hints for the second character: ${JSON.stringify(couple[0].partner_avatar_config ?? {})}.`,
      `Shared room theme: ${space?.[0]?.room_theme ?? 'sunset'}, shared pet: ${space?.[0]?.pet_type ?? 'cat'}.`,
      'Warm pastel palette, clean composition, no text, no logos, no watermark, suitable for mobile sharing.',
    ].join(' ');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.data?.[0]?.b64_json) {
      throw new Error(result.error?.message ?? 'Image generation failed');
    }

    const { error: completeError } = await serviceClient.rpc('complete_postcard_generation', {
      p_job_id: jobId,
      p_succeeded: true,
      p_last_error: null,
    });
    if (completeError) throw completeError;
    return jsonResponse({ imageBase64: result.data[0].b64_json, occasion });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    await serviceClient.rpc('complete_postcard_generation', {
      p_job_id: jobId,
      p_succeeded: false,
      p_last_error: message,
    });
    return jsonResponse({ error: message }, 502);
  }
});
