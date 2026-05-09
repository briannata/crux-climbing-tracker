import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '@/constants/climbing';

const TabIcon = ({ children, color }: { children: string; color: string }) => (
  <Text style={{ fontSize: 20, color }}>{children}</Text>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textSec,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabIcon color={color}>🏠</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color }) => <TabIcon color={color}>📖</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabIcon color={color}>📊</TabIcon>,
        }}
      />
    </Tabs>
  );
}
