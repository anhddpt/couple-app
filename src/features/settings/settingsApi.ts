import { requireSupabase } from '@/services/supabase/client';
import type { NotificationContentMode, QuietHours } from '@/types/domain';

export async function getUserSettings() {
  const client = requireSupabase();
  const [{ data: notification, error: notificationError }, { data: actions, error: actionsError }] =
    await Promise.all([
      client
        .from('user_notification_settings')
        .select('push_enabled, content_mode, quiet_hours_enabled, quiet_start, quiet_end, timezone')
        .maybeSingle(),
      client.from('user_action_settings').select('action_type, enabled, push_enabled'),
    ]);
  if (notificationError) throw notificationError;
  if (actionsError) throw actionsError;
  return {
    notification: (notification ?? {
      push_enabled: true,
      content_mode: 'generic',
      quiet_hours_enabled: false,
      quiet_start: '22:00:00',
      quiet_end: '07:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
    }) as {
      push_enabled: boolean;
      content_mode: NotificationContentMode;
      quiet_hours_enabled: boolean;
      quiet_start: string;
      quiet_end: string;
      timezone: string;
    },
    actions: (actions ?? []) as { action_type: string; enabled: boolean; push_enabled: boolean }[],
  };
}

export async function setNotificationContentMode(contentMode: NotificationContentMode) {
  const { error } = await requireSupabase().rpc('set_notification_content_mode', {
    p_content_mode: contentMode,
  });
  if (error) throw error;
}

export async function setNotificationPushEnabled(enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_notification_push_enabled', { p_enabled: enabled });
  if (error) throw error;
}

export async function setQuietHours(quietHours: QuietHours) {
  const { error } = await requireSupabase().rpc('set_quiet_hours', {
    p_enabled: quietHours.enabled,
    p_start: quietHours.start,
    p_end: quietHours.end,
    p_timezone: quietHours.timezone,
  });
  if (error) throw error;
}

export async function setActionEnabled(actionType: string, enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_action_enabled', {
    p_action_type: actionType,
    p_enabled: enabled,
  });
  if (error) throw error;
}

export async function setActionPushEnabled(actionType: string, enabled: boolean) {
  const { error } = await requireSupabase().rpc('set_action_push_enabled', {
    p_action_type: actionType,
    p_enabled: enabled,
  });
  if (error) throw error;
}
