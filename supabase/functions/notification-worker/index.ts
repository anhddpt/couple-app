import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

type ActionType =
  | 'HEAD_PAT'
  | 'BONK'
  | 'PUSH_AWAY'
  | 'HUG'
  | 'HUNGRY'
  | 'MISS_YOU'
  | 'CHEEK_POKE'
  | 'KISS'
  | 'SLEEPY'
  | 'VOICE';
type ContentMode = 'generic' | 'sender_only' | 'detailed';

type Delivery = {
  delivery_id: string;
  lease_id: string;
  device_id: string;
  expo_push_token: string;
  interaction_id: string;
  couple_id: string;
  sender_name: string;
  receiver_locale: 'vi' | 'en';
  content_mode: ContentMode;
  action_type: ActionType;
  attempt_count: number;
};

const detailedMessages: Record<'vi' | 'en', Record<ActionType, string>> = {
  vi: {
    HEAD_PAT: '{{name}} vừa xoa đầu bạn',
    BONK: '{{name}} vừa gõ đầu bạn',
    PUSH_AWAY: '{{name}} đang muốn giữ khoảng cách',
    HUG: '{{name}} vừa ôm bạn',
    HUNGRY: '{{name}} đang đói',
    MISS_YOU: '{{name}} đang nhớ bạn',
    CHEEK_POKE: '{{name}} vừa chọc má bạn',
    KISS: '{{name}} vừa hôn bạn',
    SLEEPY: '{{name}} đang buồn ngủ',
    VOICE: '{{name}} vừa gửi một voice action',
  },
  en: {
    HEAD_PAT: '{{name}} gave you a head pat',
    BONK: '{{name}} bonked you',
    PUSH_AWAY: '{{name}} needs a little space',
    HUG: '{{name}} hugged you',
    HUNGRY: '{{name}} is hungry',
    MISS_YOU: '{{name}} misses you',
    CHEEK_POKE: '{{name}} poked your cheek',
    KISS: '{{name}} kissed you',
    SLEEPY: '{{name}} is getting sleepy',
    VOICE: '{{name}} sent a voice action',
  },
};

function getBody(delivery: Delivery) {
  const locale = delivery.receiver_locale === 'en' ? 'en' : 'vi';
  if (delivery.content_mode === 'generic') {
    return locale === 'vi' ? 'Bạn vừa nhận một action mới' : 'You received a new action';
  }
  if (delivery.content_mode === 'sender_only') {
    return locale === 'vi'
      ? `Bạn có tương tác mới từ ${delivery.sender_name}`
      : `You have a new action from ${delivery.sender_name}`;
  }
  return detailedMessages[locale][delivery.action_type].replace('{{name}}', delivery.sender_name);
}

async function completeDelivery(
  supabase: ReturnType<typeof createServiceClient>,
  params: Record<string, unknown>,
) {
  const { error } = await supabase.rpc('complete_notification_delivery', params);
  if (error) throw error;
}

async function completeReceipt(
  supabase: ReturnType<typeof createServiceClient>,
  params: Record<string, unknown>,
) {
  const { error } = await supabase.rpc('complete_notification_receipt', params);
  if (error) throw error;
}

async function processReceipts(supabase: ReturnType<typeof createServiceClient>) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('id, device_id, provider_ticket_id, ticketed_at, receipt_attempt_count, attempt_count')
    .eq('status', 'ticketed')
    .not('provider_ticket_id', 'is', null)
    .lte('next_receipt_check_at', now)
    .order('next_receipt_check_at', { ascending: true })
    .limit(300);
  if (error) throw error;
  if (!data?.length) return 0;

  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ids: data.map((item) => item.provider_ticket_id) }),
  });
  if (!response.ok) throw new Error(`Expo receipts HTTP ${response.status}`);
  const payload = await response.json();

  await Promise.all(
    data.map(async (item) => {
      const receipt = payload.data?.[item.provider_ticket_id ?? ''];
      if (!receipt) {
        const expired =
          item.ticketed_at && Date.now() - new Date(item.ticketed_at).getTime() > 23 * 60 * 60 * 1000;
        await completeReceipt(supabase, {
          p_delivery_id: item.id,
          p_status: expired ? 'failed' : 'ticketed',
          p_last_error: expired ? 'Expo receipt expired' : 'Expo receipt not available yet',
          p_retry_after_seconds: 900,
        });
        return;
      }
      if (receipt.status === 'ok') {
        await completeReceipt(supabase, {
          p_delivery_id: item.id,
          p_status: 'sent',
        });
        return;
      }

      const deviceNotRegistered = receipt.details?.error === 'DeviceNotRegistered';
      const rateLimited = receipt.details?.error === 'MessageRateExceeded';
      const canRetrySend = rateLimited && Number(item.attempt_count ?? 0) < 5;
      if (deviceNotRegistered) {
        const { error: deviceError } = await supabase
          .from('devices')
          .update({ is_active: false })
          .eq('id', item.device_id);
        if (deviceError) throw deviceError;
      }
      await completeReceipt(supabase, {
        p_delivery_id: item.id,
        p_status: canRetrySend ? 'pending' : 'failed',
        p_last_error: receipt.message ?? receipt.details?.error ?? 'Push receipt failed',
        p_retry_after_seconds: canRetrySend
          ? Math.min(3600, 60 * 2 ** Number(item.receipt_attempt_count ?? 0))
          : null,
      });
    }),
  );

  return data.length;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const workerSecret = Deno.env.get('WORKER_SECRET') ?? '';
  if (!workerSecret || request.headers.get('X-Worker-Secret') !== workerSecret) {
    return jsonResponse({ error: 'Worker authorization required' }, 401);
  }

  const supabase = createServiceClient();
  let processedReceipts = 0;
  let receiptError: string | null = null;
  try {
    processedReceipts = await processReceipts(supabase);
  } catch (error) {
    receiptError = error instanceof Error ? error.message : 'Failed to process push receipts';
  }

  const { data, error } = await supabase.rpc('claim_notification_deliveries', { p_limit: 50 });
  if (error) return jsonResponse({ error: error.message }, 500);

  const deliveries = (data ?? []) as Delivery[];
  const results = await Promise.all(
    deliveries.map(async (delivery) => {
      try {
        const { data: validatedData, error: validationError } = await supabase.rpc(
          'validate_claimed_notification_delivery',
          { p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id },
        );
        if (validationError) throw validationError;
        const validated = (validatedData?.[0] ?? null) as Delivery | null;
        if (!validated) return { id: delivery.delivery_id, status: 'suppressed' };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            to: validated.expo_push_token,
            title: 'Couple App',
            body: getBody(validated),
            data: {
              interactionId: validated.interaction_id,
              coupleId: validated.couple_id,
            },
            channelId: 'couple-actions',
            collapseId: `couple:${validated.couple_id}`,
            tag: `couple:${validated.couple_id}`,
            priority: 'high',
          }),
        });

        if (!response.ok) throw new Error(`Expo Push HTTP ${response.status}`);
        const payload = await response.json();
        const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;

        if (ticket?.status === 'ok' && ticket.id) {
          await completeDelivery(supabase, {
            p_delivery_id: delivery.delivery_id,
            p_lease_id: delivery.lease_id,
            p_status: 'ticketed',
            p_provider_ticket_id: ticket.id,
          });
          return { id: delivery.delivery_id, status: 'ticketed' };
        }

        const message = ticket?.message ?? 'Expo Push rejected the notification';
        const deviceNotRegistered = ticket?.details?.error === 'DeviceNotRegistered';
        if (deviceNotRegistered) {
          await supabase.from('devices').update({ is_active: false }).eq('id', delivery.device_id);
        }

        const retry = !deviceNotRegistered && delivery.attempt_count < 5;
        await completeDelivery(supabase, {
          p_delivery_id: delivery.delivery_id,
          p_lease_id: delivery.lease_id,
          p_status: retry ? 'pending' : 'failed',
          p_last_error: message,
          p_retry_after_seconds: retry ? Math.min(3600, 30 * 2 ** delivery.attempt_count) : null,
        });
        return { id: delivery.delivery_id, status: retry ? 'pending' : 'failed' };
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : 'Unknown push error';
        const retry = delivery.attempt_count < 5;
        await completeDelivery(supabase, {
          p_delivery_id: delivery.delivery_id,
          p_lease_id: delivery.lease_id,
          p_status: retry ? 'pending' : 'failed',
          p_last_error: message,
          p_retry_after_seconds: retry ? Math.min(3600, 30 * 2 ** delivery.attempt_count) : null,
        });
        return { id: delivery.delivery_id, status: retry ? 'pending' : 'failed' };
      }
    }),
  );

  return jsonResponse({ processedReceipts, receiptError, claimed: deliveries.length, results });
});
