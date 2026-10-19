import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { LoadingView } from '@/components/LoadingView';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import {
  deactivateAccount,
  getUserSettings,
  requestHardDelete,
  setActionEnabled,
  setActionPushEnabled,
  setNotificationContentMode,
  setNotificationPushEnabled,
  setQuietHours,
  unmatch,
} from '@/services/supabase/api';
import { colors, radius, spacing } from '@/theme';
import type { ActionType, NotificationContentMode } from '@/types/domain';
import { actionTypes } from '@/types/domain';

const contentModes: NotificationContentMode[] = ['generic', 'sender_only', 'detailed'];
const modeLabel: Record<NotificationContentMode, string> = {
  generic: 'settings.generic',
  sender_only: 'settings.senderOnly',
  detailed: 'settings.detailed',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { refresh, signOut } = useAuth();
  const [contentMode, setContentMode] = useState<NotificationContentMode>('generic');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [timezone, setTimezone] = useState(
    Localization.getCalendars()[0]?.timeZone ?? 'Asia/Ho_Chi_Minh',
  );
  const [enabledActions, setEnabledActions] = useState<Record<ActionType, boolean>>(
    Object.fromEntries(actionTypes.map((action) => [action, true])) as Record<ActionType, boolean>,
  );
  const [actionPushEnabled, setActionPushState] = useState<Record<ActionType, boolean>>(
    Object.fromEntries(actionTypes.map((action) => [action, true])) as Record<ActionType, boolean>,
  );
  const [error, setError] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

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
        setActionPushState((current) => ({
          ...current,
          ...Object.fromEntries(actions.map((item) => [item.action_type, item.push_enabled])),
        }));
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t('error.generic'));
        }
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  async function chooseMode(mode: NotificationContentMode) {
    try {
      setError('');
      await setNotificationContentMode(mode);
      setContentMode(mode);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  async function toggleAction(action: ActionType) {
    const nextValue = !enabledActions[action];
    try {
      setError('');
      await setActionEnabled(action, nextValue);
      setEnabledActions((current) => ({ ...current, [action]: nextValue }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  async function toggleMasterPush() {
    const nextValue = !pushEnabled;
    try {
      await setNotificationPushEnabled(nextValue);
      setPushEnabled(nextValue);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  async function saveQuietHours() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd)) {
      setError(t('settings.invalidTime'));
      return;
    }
    try {
      setError('');
      await setQuietHours({
        enabled: quietEnabled,
        start: quietStart,
        end: quietEnd,
        timezone,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  async function toggleActionPush(action: ActionType) {
    const nextValue = !actionPushEnabled[action];
    try {
      await setActionPushEnabled(action, nextValue);
      setActionPushState((current) => ({ ...current, [action]: nextValue }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  function confirmUnmatch() {
    Alert.alert(t('settings.unmatchTitle'), t('settings.unmatchBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.unmatch'),
        style: 'destructive',
        onPress: () =>
          void unmatch().then(async () => {
            await refresh();
            router.replace('/');
          }),
      },
    ]);
  }

  function confirmDeactivate() {
    Alert.alert(t('settings.deactivateTitle'), t('settings.deactivateBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deactivate'),
        style: 'destructive',
        onPress: () =>
          void deactivateAccount().then(async () => {
            await signOut();
            router.replace('/');
          }),
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      t('settings.deleteTitle'),
      t('settings.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () =>
            void requestHardDelete().then(async () => {
              await signOut();
              router.replace('/');
            }),
        },
      ],
    );
  }

  if (loadingSettings) return <LoadingView label={t('common.loading')} />;

  return (
    <Screen scroll>
      <AppText variant="heading2">{t('settings.avatar')}</AppText>
      <AppButton
        label={t('settings.editAvatar')}
        variant="secondary"
        onPress={() => router.push('/(onboarding)/avatar')}
      />

      <AppText variant="heading2">{t('settings.notifications')}</AppText>
      <Pressable onPress={toggleMasterPush} style={styles.actionRow}>
        <AppText>Push notification</AppText>
        <AppText color={pushEnabled ? 'success' : 'danger'}>
          {pushEnabled ? t('common.on') : t('common.off')}
        </AppText>
      </Pressable>
      <View style={styles.options}>
        {contentModes.map((mode) => {
          const selected = mode === contentMode;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={mode}
              onPress={() => chooseMode(mode)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <AppText color={selected ? 'surface' : 'textPrimary'}>{t(modeLabel[mode])}</AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="heading2">{t('settings.quietHours')}</AppText>
      <Pressable onPress={() => setQuietEnabled((current) => !current)} style={styles.actionRow}>
        <AppText>{t('settings.quietHoursEnabled')}</AppText>
        <AppText color={quietEnabled ? 'success' : 'danger'}>
          {quietEnabled ? t('common.on') : t('common.off')}
        </AppText>
      </Pressable>
      <View style={styles.timeRow}>
        <View style={styles.timeInput}>
          <AppInput
            label={t('settings.quietStart')}
            placeholder="22:00"
            value={quietStart}
            onChangeText={setQuietStart}
          />
        </View>
        <View style={styles.timeInput}>
          <AppInput
            label={t('settings.quietEnd')}
            placeholder="07:00"
            value={quietEnd}
            onChangeText={setQuietEnd}
          />
        </View>
      </View>
      <AppInput label={t('settings.timezone')} value={timezone} onChangeText={setTimezone} />
      <AppButton label={t('common.save')} variant="secondary" onPress={saveQuietHours} />

      <AppText variant="heading2">{t('settings.allowedActions')}</AppText>
      <View style={styles.options}>
        {actionTypes.map((action) => (
          <View key={action} style={styles.actionSetting}>
            <AppText variant="label">{action}</AppText>
            <Pressable onPress={() => toggleAction(action)} style={styles.smallToggle}>
              <AppText color={enabledActions[action] ? 'success' : 'danger'}>
                {t('settings.receive')}: {enabledActions[action] ? t('common.on') : t('common.off')}
              </AppText>
            </Pressable>
            <Pressable onPress={() => toggleActionPush(action)} style={styles.smallToggle}>
              <AppText color={actionPushEnabled[action] ? 'success' : 'danger'}>
                Push: {actionPushEnabled[action] ? t('common.on') : t('common.off')}
              </AppText>
            </Pressable>
          </View>
        ))}
      </View>

      {error ? <AppText color="danger">{error}</AppText> : null}
      <View style={styles.dangerZone}>
        <AppButton label={t('settings.unmatch')} variant="secondary" onPress={confirmUnmatch} />
        <AppButton label={t('settings.deactivate')} variant="danger" onPress={confirmDeactivate} />
        <AppButton label={t('settings.deleteAccount')} variant="danger" onPress={confirmDelete} />
        <AppButton label={t('common.signOut')} variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing[2] },
  option: {
    padding: spacing[4],
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  actionSetting: {
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  smallToggle: { minHeight: 44, justifyContent: 'center' },
  timeRow: { flexDirection: 'row', gap: spacing[3] },
  timeInput: { flex: 1 },
  dangerZone: { marginTop: spacing[5], gap: spacing[3] },
});
