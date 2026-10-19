import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { reactivateAccount } from '@/features/account/accountApi';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function ReactivateScreen() {
  const { t } = useTranslation();
  const { refresh, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function reactivate() {
    setLoading(true);
    try {
      await reactivateAccount();
      await refresh();
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <AppText variant="heading1" align="center">
        {t('account.deactivatedTitle')}
      </AppText>
      <AppText color="textSecondary" align="center">
        {t('account.deactivatedBody')}
      </AppText>
      <AppButton label={t('account.reactivate')} loading={loading} onPress={reactivate} />
      <AppButton label={t('common.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { justifyContent: 'center', gap: spacing[5] } });
