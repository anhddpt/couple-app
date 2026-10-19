import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { sendOtp } from '@/services/supabase/api';
import { spacing } from '@/theme';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!email.includes('@')) {
      setError(t('validation.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      await sendOtp(email);
      router.push({ pathname: '/(auth)/otp', params: { email: email.trim().toLowerCase() } });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <AppText variant="display" align="center">
        Couple App
      </AppText>
      <AppText variant="heading2" align="center" color="textSecondary">
        {t('auth.title')}
      </AppText>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t('auth.emailLabel')}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={error}
      />
      <AppButton label={t('auth.sendOtp')} loading={loading} onPress={handleSendOtp} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing[5] },
});
