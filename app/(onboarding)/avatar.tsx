import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { avatarCatalog } from '@/features/avatar/catalog';
import { ChibiAvatar } from '@/features/avatar/ChibiAvatar';
import { defaultAvatarConfigs } from '@/features/avatar/presets';
import { useAuth } from '@/providers/AuthProvider';
import { saveAvatar } from '@/services/supabase/api';
import { colors, radius, spacing } from '@/theme';
import type { AvatarConfig } from '@/types/domain';

type ConfigKey = Exclude<keyof AvatarConfig, 'version'>;

export default function AvatarScreen() {
  const { t } = useTranslation();
  const { session, profile, avatar, refresh } = useAuth();
  const [config, setConfig] = useState<AvatarConfig>(avatar?.config ?? defaultAvatarConfigs.coral);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function choose(key: ConfigKey, value: string | null) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!session) return;
    try {
      setLoading(true);
      setError('');
      await saveAvatar(session.user.id, avatar?.preset_id ?? 'coral', config);
      await refresh();
      router.replace('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  function renderOptions(
    key: ConfigKey,
    options: Record<string, { label: string; color?: string; value?: string }>,
    includeNone = false,
  ) {
    const selectedValue = config[key];
    return (
      <View style={styles.options}>
        {includeNone ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedValue === null }}
            onPress={() => choose(key, null)}
            style={[styles.option, selectedValue === null && styles.optionSelected]}
          >
            <AppText variant="label">{t('avatar.none')}</AppText>
          </Pressable>
        ) : null}
        {Object.entries(options).map(([id, option]) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedValue === id }}
            key={id}
            onPress={() => choose(key, id)}
            style={[styles.option, selectedValue === id && styles.optionSelected]}
          >
            {option.color ? <View style={[styles.swatch, { backgroundColor: option.color }]} /> : null}
            {option.value ? <AppText variant="heading2">{option.value}</AppText> : null}
            <AppText variant="caption">{option.label}</AppText>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Screen scroll>
      <AppText variant="heading1" align="center">
        {t('onboarding.avatarTitle')}
      </AppText>
      <View style={styles.preview}>
        <ChibiAvatar
          name={profile?.display_name ?? t('common.you')}
          presetId={avatar?.preset_id ?? 'coral'}
          config={config}
          mood="happy"
          size={180}
        />
      </View>
      <AppText variant="heading2">{t('avatar.skin')}</AppText>
      {renderOptions('skin', avatarCatalog.skin)}
      <AppText variant="heading2">{t('avatar.hair')}</AppText>
      {renderOptions('hair', avatarCatalog.hair)}
      <AppText variant="heading2">{t('avatar.eyes')}</AppText>
      {renderOptions('eyes', avatarCatalog.eyes)}
      <AppText variant="heading2">{t('avatar.mouth')}</AppText>
      {renderOptions('mouth', avatarCatalog.mouth)}
      <AppText variant="heading2">{t('avatar.outfit')}</AppText>
      {renderOptions('outfit', avatarCatalog.outfit)}
      <AppText variant="heading2">{t('avatar.accessory')}</AppText>
      {renderOptions('accessory', avatarCatalog.accessory, true)}
      {error ? <AppText color="danger">{error}</AppText> : null}
      <AppButton label={t('common.save')} loading={loading} onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: spacing[3] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  option: {
    minWidth: 72,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    padding: spacing[2],
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, borderWidth: 2 },
  swatch: { width: 28, height: 28, borderRadius: radius.round },
});
