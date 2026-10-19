export const colors = {
  background: '#FFF8F2',
  surface: '#FFFFFF',
  primary: '#C34F62',
  primaryPressed: '#A63A50',
  secondary: '#F7C59F',
  accent: '#FFD6A5',
  textPrimary: '#3D3232',
  textSecondary: '#796B6B',
  border: '#EEDFD7',
  success: '#4B876A',
  warning: '#A66B1F',
  danger: '#B33A3A',
  overlay: 'rgba(61, 50, 50, 0.36)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
