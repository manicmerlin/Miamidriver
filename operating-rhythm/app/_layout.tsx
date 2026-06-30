import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ensureDb } from '@/db/client';
import { getSetting, SettingKey } from '@/db/settings';
import { useAppFonts } from '@/theme/fonts';
import { configureNotifications } from '@/lib/notifications';
import { flushOutbox } from '@/lib/webhook';

function Gate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      await ensureDb();
      await configureNotifications();
      void flushOutbox();
      const flag = await getSetting(SettingKey.ONBOARDED);
      setOnboarded(flag === 'true');
      setReady(true);
    })();
  }, []);

  // Re-read the onboarded flag whenever the user navigates — covers the
  // case where the onboarding flow flips the setting and then routes away.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const flag = await getSetting(SettingKey.ONBOARDED);
      const next = flag === 'true';
      if (next !== onboarded) setOnboarded(next);
    })();
  }, [segments, ready, onboarded]);

  useEffect(() => {
    if (onboarded === null) return;
    const first = segments[0];
    if (!onboarded && first !== 'onboarding') {
      router.replace('/onboarding');
    } else if (onboarded && first === 'onboarding') {
      router.replace('/');
    }
  }, [onboarded, segments]);

  if (!ready) {
    return <Loading />;
  }
  return <>{children}</>;
}

function Loading() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg }}>
      <ActivityIndicator color={t.colors.accent} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {fontsLoaded === false ? (
            <Loading />
          ) : (
            <Gate>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: '#0A1018' },
                  headerTintColor: '#B7892D',
                  headerTitleStyle: { fontFamily: 'Spectral-Medium' },
                  contentStyle: { backgroundColor: '#0A1018' },
                }}
              >
                <Stack.Screen name="index" options={{ title: 'Rhythm' }} />
                <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
                <Stack.Screen name="compartments/index" options={{ title: 'Compartments' }} />
                <Stack.Screen name="compartments/[id]" options={{ title: 'Compartment' }} />
                <Stack.Screen name="briefing/index" options={{ title: 'Weekly Briefing' }} />
                <Stack.Screen name="briefing/result" options={{ title: 'BLUF' }} />
                <Stack.Screen name="orders/index" options={{ title: 'Daily Orders' }} />
                <Stack.Screen name="orders/aar" options={{ title: 'End of day' }} />
                <Stack.Screen name="defaults/index" options={{ title: 'Designed Defaults' }} />
                <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
              </Stack>
            </Gate>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
