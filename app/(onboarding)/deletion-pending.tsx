import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function DeletionPendingScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  return (
    <Screen style={styles.container}>
      <AppText variant="heading1" align="center">
        {t('account.deletionPendingTitle')}
      </AppText>
      <AppText color="textSecondary" align="center">
        {t('account.deletionPendingBody')}
      </AppText>
      <AppButton label={t('common.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { justifyContent: 'center', gap: spacing[5] } });
