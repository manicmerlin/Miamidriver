import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
};

export function Screen({ scroll = true, padded = true, style, children }: Props) {
  const t = useTheme();
  const inner = (
    <View
      style={[
        { flex: 1, padding: padded ? t.space.base : 0, gap: t.space.base },
        style,
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style={t.colors.mode === 'dark' ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: t.space.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
