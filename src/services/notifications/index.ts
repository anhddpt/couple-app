import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { deactivateDevice, registerDevice } from '@/services/supabase/api';
import { colors } from '@/theme';

const deviceIdKey = 'couple-app:device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

async function getDeviceFingerprint() {
  const existing = await AsyncStorage.getItem(deviceIdKey);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(deviceIdKey, created);
  return created;
}

export async function registerForPushNotifications() {
  if (Platform.OS !== 'android' || !Device.isDevice || !env.easProjectId) return null;

  await Notifications.setNotificationChannelAsync('couple-actions', {
    name: 'Couple actions',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    lightColor: colors.primary,
  });

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();

  if (permission.status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
  await registerDevice({
    expoPushToken: token.data,
    deviceFingerprint: await getDeviceFingerprint(),
    platform: 'android',
  });

  return token.data;
}

export async function unregisterCurrentPushDevice() {
  const fingerprint = await AsyncStorage.getItem(deviceIdKey);
  if (fingerprint) {
    await deactivateDevice(fingerprint).catch(() => undefined);
  }
  await Notifications.unregisterForNotificationsAsync().catch(() => undefined);
}
