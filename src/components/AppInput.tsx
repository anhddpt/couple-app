import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AppInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        {...props}
        style={[styles.input, error && styles.errorInput, style]}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing[4],
    ...typography.body,
  },
  errorInput: { borderColor: colors.danger },
});
