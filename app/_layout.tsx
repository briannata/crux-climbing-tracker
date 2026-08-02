import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { C } from '@/constants/climbing';
import { ClimbsProvider } from '@/hooks/use-climbs';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const { user, loaded } = useCurrentUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;
    const onOnboarding = (segments[0] as string) === 'onboarding';
    if (!user && !onOnboarding) {
      router.replace('/onboarding' as never);
    } else if (user && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [user, loaded, segments, router]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="climb/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="wrapped/[month]"
        options={{ presentation: 'modal', headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CurrentUserProvider>
        <ClimbsProvider>
          <ThemeProvider value={DarkTheme}>
            <AuthGate />
            <StatusBar style="light" />
          </ThemeProvider>
        </ClimbsProvider>
      </CurrentUserProvider>
    </SafeAreaProvider>
  );
}
