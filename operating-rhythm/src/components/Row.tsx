import React from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & {
  gap?: number;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
};

export function Row({ gap = 0, align = 'center', justify = 'flex-start', wrap, style, children, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? 'wrap' : 'nowrap' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
