import * as Localization from 'expo-localization';
import { useEffect, useState } from 'react';

import type { ActionType, NotificationContentMode } from '@/types/domain';
import { actionTypes } from '@/types/domain';

import {
  getUserSettings,
  setActionEnabled,
  setActionPushEnabled,
  setNotificationContentMode,
  setNotificationPushEnabled,
  setQuietHours,
} from './settingsApi';

function actionDefaults() {
  return Object.fromEntries(actionTypes.map((action) => [action, true])) as Record<ActionType, boolean>;
}

export function useUserSettings(fallbackError: string, invalidTimeError: string) {
  const [contentMode, setContentMode] = useState<NotificationContentMode>('generic');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [timezone, setTimezone] = useState(
    Localization.getCalendars()[0]?.timeZone ?? 'Asia/Ho_Chi_Minh',
  );
  const [enabledActions, setEnabledActions] = useState(actionDefaults);
  const [actionPushEnabled, setActionPushEnabledState] = useState(actionDefaults);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getUserSettings()
      .then(({ notification, actions }) => {
        if (!active) return;
        setPushEnabled(notification.push_enabled);
        setContentMode(notification.content_mode);
        setQuietEnabled(notification.quiet_hours_enabled);
        setQuietStart(notification.quiet_start.slice(0, 5));
        setQuietEnd(notification.quiet_end.slice(0, 5));
        setTimezone(notification.timezone);
        setEnabledActions((current) => ({
          ...current,
          ...Object.fromEntries(actions.map((item) => [item.action_type, item.enabled])),
        }));
        setActionPushEnabledState((current) => ({
          ...current,
          ...Object.fromEntries(actions.map((item) => [item.action_type, item.push_enabled])),
        }));
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : fallbackError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fallbackError]);

  async function runMutation(task: () => Promise<void>, apply: () => void) {
    try {
      setError('');
      await task();
      apply();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : fallbackError);
    }
  }

  const chooseMode = (mode: NotificationContentMode) =>
    runMutation(() => setNotificationContentMode(mode), () => setContentMode(mode));

  const toggleMasterPush = () => {
    const nextValue = !pushEnabled;
    return runMutation(() => setNotificationPushEnabled(nextValue), () => setPushEnabled(nextValue));
  };

  const toggleAction = (action: ActionType) => {
    const nextValue = !enabledActions[action];
    return runMutation(
      () => setActionEnabled(action, nextValue),
      () => setEnabledActions((current) => ({ ...current, [action]: nextValue })),
    );
  };

  const toggleActionPush = (action: ActionType) => {
    const nextValue = !actionPushEnabled[action];
    return runMutation(
      () => setActionPushEnabled(action, nextValue),
      () => setActionPushEnabledState((current) => ({ ...current, [action]: nextValue })),
    );
  };

  async function saveQuietHours() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd)) {
      setError(invalidTimeError);
      return;
    }
    await runMutation(
      () => setQuietHours({ enabled: quietEnabled, start: quietStart, end: quietEnd, timezone }),
      () => undefined,
    );
  }

  return {
    loading,
    error,
    contentMode,
    pushEnabled,
    quietEnabled,
    quietStart,
    quietEnd,
    timezone,
    enabledActions,
    actionPushEnabled,
    setQuietEnabled,
    setQuietStart,
    setQuietEnd,
    setTimezone,
    chooseMode,
    toggleMasterPush,
    toggleAction,
    toggleActionPush,
    saveQuietHours,
  };
}
