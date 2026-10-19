import { StyleSheet } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Screen } from './Screen';

export function ConfigRequired() {
  return (
    <Screen style={styles.container}>
      <AppText variant="heading1" align="center">
        Supabase configuration required
      </AppText>
      <AppText color="textSecondary" align="center">
        Copy .env.example to .env and configure EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing[4] },
});
