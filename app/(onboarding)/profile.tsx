import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { saveProfile } from '@/services/supabase/api';
import { spacing } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, refresh } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!session || name.trim().length < 1) {
      setError(t('validation.displayNameRequired'));
      return;
    }

    try {
      setLoading(true);
      await saveProfile(session.user, name);
      await refresh();
      router.replace('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <AppText variant="heading1" align="center">
        {t('onboarding.profileTitle')}
      </AppText>
      <AppInput
        label={t('onboarding.displayName')}
        maxLength={40}
        value={name}
        onChangeText={setName}
        error={error}
      />
      <AppButton label={t('common.continue')} loading={loading} onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { justifyContent: 'center', gap: spacing[5] } });
