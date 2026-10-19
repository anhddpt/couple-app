import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = ViewProps & {
  scroll?: boolean;
};

export function Screen({ scroll, children, style, ...props }: Props) {
  const content = (
    <View {...props} style={[styles.content, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing[5], gap: spacing[4] },
  scroll: { flexGrow: 1 },
});
