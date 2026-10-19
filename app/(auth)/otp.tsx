import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { verifyOtp } from '@/features/auth/authApi';
import { spacing } from '@/theme';

export default function OtpScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (!email || token.trim().length !== 6) {
      setError(t('validation.invalidOtp'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyOtp(email, token);
      router.replace('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <AppText variant="heading1">{t('auth.otpLabel')}</AppText>
      <AppText color="textSecondary">{t('auth.otpSent', { email })}</AppText>
      <AppInput
        autoFocus
        keyboardType="number-pad"
        label={t('auth.otpLabel')}
        maxLength={6}
        value={token}
        onChangeText={setToken}
        error={error}
      />
      <AppButton label={t('auth.verifyOtp')} loading={loading} onPress={handleVerify} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing[5] },
});
