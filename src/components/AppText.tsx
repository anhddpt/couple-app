import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: keyof typeof colors;
  align?: TextStyle['textAlign'];
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...props
}: Props) {
  return (
    <Text
      {...props}
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
    />
  );
}
