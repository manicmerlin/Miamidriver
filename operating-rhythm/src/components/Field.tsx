import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  multiline?: boolean;
  error?: string | null;
};

export function Field({ label, hint, multiline, error, style, ...rest }: Props) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.xs }}>
      {label ? <Text v="label" tone="muted">{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.colors.textMuted}
        {...rest}
        multiline={multiline}
        style={[
          {
            borderWidth: t.stroke.hairline,
            borderColor: error ? t.colors.signalRed : t.colors.rule,
            borderRadius: t.radii.base,
            paddingHorizontal: t.space.md,
            paddingVertical: t.space.md,
            color: t.colors.textPrimary,
            backgroundColor: t.colors.surface,
            minHeight: multiline ? 84 : 44,
            textAlignVertical: multiline ? 'top' : 'center',
            fontFamily: t.text.body.fontFamily,
            fontSize: t.text.body.fontSize,
          },
          style,
        ]}
      />
      {hint && !error ? <Text v="caption" tone="muted">{hint}</Text> : null}
      {error ? <Text v="caption" tone="red">{error}</Text> : null}
    </View>
  );
}
