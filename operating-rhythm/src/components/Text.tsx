import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant =
  | 'display'
  | 'heading'
  | 'serif'
  | 'title'
  | 'body'
  | 'bodyMd'
  | 'caption'
  | 'mono'
  | 'stamp'
  | 'label';

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'amber' | 'red' | 'green';

type Props = TextProps & {
  v?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
};

export function Text({ v = 'body', tone = 'primary', align, style, ...rest }: Props) {
  const t = useTheme();
  const color =
    tone === 'muted'
      ? t.colors.textMuted
      : tone === 'secondary'
      ? t.colors.textSecondary
      : tone === 'accent'
      ? t.colors.accent
      : tone === 'amber'
      ? t.colors.signalAmber
      : tone === 'red'
      ? t.colors.signalRed
      : tone === 'green'
      ? t.colors.signalGreen
      : t.colors.textPrimary;
  return (
    <RNText
      {...rest}
      style={[t.text[v], { color, textAlign: align }, style]}
    />
  );
}
