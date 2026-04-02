import { Tabs } from 'expo-router'
import { colors } from '@/lib/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surface2,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="food-log"
        options={{ title: 'Food', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="fast"
        options={{ title: 'Fast', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: () => null }}
      />
    </Tabs>
  )
}
