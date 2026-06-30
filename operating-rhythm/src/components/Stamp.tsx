import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label: string;
  tone?: 'brass' | 'amber' | 'red' | 'green' | 'muted';
};

export function Stamp({ label, tone = 'brass' }: Props) {
  const t = useTheme();
  const color =
    tone === 'amber'
      ? t.colors.signalAmber
      : tone === 'red'
      ? t.colors.signalRed
      : tone === 'green'
      ? t.colors.signalGreen
      : tone === 'muted'
      ? t.colors.textMuted
      : t.colors.accent;
  return (
    <View
      style={{
        borderWidth: t.stroke.base,
        borderColor: color,
        paddingHorizontal: t.space.sm,
        paddingVertical: 2,
        borderRadius: t.radii.sm,
        alignSelf: 'flex-start',
      }}
    >
      <Text v="stamp" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
