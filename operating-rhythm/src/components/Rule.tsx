import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  vertical?: boolean;
  inset?: number;
  tone?: 'rule' | 'brass';
  style?: ViewStyle;
};

export function Rule({ vertical, inset = 0, tone = 'rule', style }: Props) {
  const t = useTheme();
  const color = tone === 'brass' ? t.colors.accent : t.colors.rule;
  return (
    <View
      style={[
        vertical
          ? { width: t.stroke.hairline, alignSelf: 'stretch', marginVertical: inset, backgroundColor: color }
          : { height: t.stroke.hairline, alignSelf: 'stretch', marginHorizontal: inset, backgroundColor: color },
        style,
      ]}
    />
  );
}
