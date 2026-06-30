import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label?: string;
  onPress?: () => void;
};

export function FAB({ label = 'Park', onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: t.space.base,
        bottom: t.space.xxl,
        paddingHorizontal: t.space.lg,
        paddingVertical: t.space.md,
        borderRadius: t.radii.pill,
        backgroundColor: t.colors.accent,
        borderWidth: t.stroke.base,
        borderColor: t.colors.accentLo,
        opacity: pressed ? 0.85 : 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      })}
    >
      <Text v="title" style={{ color: '#0A1018' }}>{label}</Text>
    </Pressable>
  );
}
