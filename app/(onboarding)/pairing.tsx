import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ChibiAvatar } from '@/features/avatar/ChibiAvatar';
import {
  createPairingInvitation,
  type PairingPreview,
  previewPairingInvitation,
  redeemPairingInvitation,
} from '@/features/pairing/pairingApi';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function PairingScreen() {
  const { t } = useTranslation();
  const { refresh, signOut } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [preview, setPreview] = useState<PairingPreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createCode() {
    try {
      setLoading(true);
      setError('');
      setCreatedCode(await createPairingInvitation());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function previewCode() {
    try {
      setLoading(true);
      setError('');
      const nextPreview = await previewPairingInvitation(inviteCode);
      if (!nextPreview) {
        setError(t('validation.invalidInvite'));
        return;
      }
      setPreview(nextPreview);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPairing() {
    if (!preview) return;
    try {
      setLoading(true);
      setError('');
      await redeemPairingInvitation(preview.invitation_id, inviteCode);
      await refresh();
      router.replace('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <AppText variant="heading1" align="center">
        {t('onboarding.pairingTitle')}
      </AppText>
      <AppButton label={t('onboarding.createInvite')} loading={loading} onPress={createCode} />
      {createdCode ? (
        <View style={styles.codeCard}>
          <AppText color="textSecondary">{t('onboarding.waiting')}</AppText>
          <AppText variant="display" align="center">
            {createdCode}
          </AppText>
        </View>
      ) : null}
      <AppInput
        autoCapitalize="characters"
        label={t('onboarding.inviteCode')}
        maxLength={12}
        value={inviteCode}
        onChangeText={(value) => {
          setInviteCode(value);
          setPreview(null);
        }}
        error={error}
      />
      {preview ? (
        <View style={styles.previewCard}>
          <AppText variant="heading2" align="center">
            {t('onboarding.confirmPairing', { name: preview.inviter_name })}
          </AppText>
          <ChibiAvatar
            name={preview.inviter_name}
            presetId={preview.inviter_avatar_preset}
            mood="happy"
          />
          <AppButton
            label={t('onboarding.confirmPairing', { name: preview.inviter_name })}
            loading={loading}
            onPress={confirmPairing}
          />
        </View>
      ) : (
        <AppButton
          label={t('onboarding.previewInvite')}
          variant="secondary"
          loading={loading}
          disabled={inviteCode.trim().length !== 12}
          onPress={previewCode}
        />
      )}
      <AppButton label={t('common.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  previewCard: {
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[5],
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
