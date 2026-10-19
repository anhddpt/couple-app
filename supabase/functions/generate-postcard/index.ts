import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createUserClient } from '../_shared/supabase.ts';

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
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401);

  const payload = await request.json().catch(() => ({}));
  const occasion = String(payload.occasion ?? 'anniversary') as Occasion;
  if (!(occasion in occasionPrompts)) return jsonResponse({ error: 'Invalid occasion' }, 400);

  const [{ data: avatar }, { data: couple }, { data: space }] = await Promise.all([
    userClient.from('avatars').select('config').eq('user_id', userData.user.id).maybeSingle(),
    userClient.rpc('get_active_couple_state'),
    userClient.rpc('get_couple_space'),
  ]);
  if (!couple?.length) return jsonResponse({ error: 'Active couple required' }, 409);

  const prompt = [
    'Create a square romantic postcard illustration for a private couples app.',
    occasionPrompts[occasion],
    'Show two original cute chibi characters, not real people and not copyrighted characters.',
    `Visual hints for the first avatar: ${JSON.stringify(avatar?.config ?? {})}.`,
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
    return jsonResponse({ error: result.error?.message ?? 'Image generation failed' }, 502);
  }

  return jsonResponse({ imageBase64: result.data[0].b64_json, occasion });
});
