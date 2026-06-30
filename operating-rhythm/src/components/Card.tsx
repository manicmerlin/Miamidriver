import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = ViewProps & {
  raised?: boolean;
  padded?: boolean;
};

export function Card({ raised, padded = true, style, children, ...rest }: Props) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: raised ? t.colors.surfaceRaised : t.colors.surface,
          borderRadius: t.radii.lg,
          borderWidth: t.stroke.hairline,
          borderColor: t.colors.rule,
          padding: padded ? t.space.base : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
