import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

const variantStyles = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  ghost: { backgroundColor: colors.transparent, borderColor: colors.transparent },
} as const;

export function AppButton({ label, variant = 'primary', loading, disabled, style, ...props }: Props) {
  const textColor = variant === 'secondary' || variant === 'ghost' ? 'primary' : 'surface';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...props}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <AppText variant="label" color={textColor}>
        {loading ? '...' : label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.48 },
});
