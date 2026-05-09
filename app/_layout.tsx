import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ClimbsProvider } from '@/hooks/use-climbs';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClimbsProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="climb/[id]" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </ClimbsProvider>
    </SafeAreaProvider>
  );
}
