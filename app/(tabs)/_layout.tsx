import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="room" options={{ title: t('room.title') }} />
      <Tabs.Screen name="history" options={{ title: t('history.title') }} />
      <Tabs.Screen name="space" options={{ title: t('space.title') }} />
      <Tabs.Screen name="postcards" options={{ title: t('postcard.title') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title') }} />
    </Tabs>
  );
}
