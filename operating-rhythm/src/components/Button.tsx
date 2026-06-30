import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'primary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, tone = 'primary', disabled, style }: Props) {
  const t = useTheme();
  const bg =
    tone === 'primary'
      ? t.colors.accent
      : tone === 'danger'
      ? t.colors.signalRed
      : 'transparent';
  const fg =
    tone === 'ghost' ? t.colors.textPrimary : '#0A1018';
  const border =
    tone === 'ghost' ? t.colors.rule : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: t.radii.base,
          borderWidth: t.stroke.hairline,
          borderColor: border,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          alignItems: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View>
        <Text v="title" style={{ color: fg, fontSize: 15 }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
