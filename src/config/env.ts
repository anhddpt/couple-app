import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAndroidUrl = process.env.EXPO_PUBLIC_SUPABASE_ANDROID_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const platformSupabaseUrl = Platform.OS === 'android' && supabaseAndroidUrl
  ? supabaseAndroidUrl
  : supabaseUrl;

export const env = {
  supabaseUrl: platformSupabaseUrl,
  supabaseAnonKey,
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? '',
  isSupabaseConfigured: Boolean(platformSupabaseUrl && supabaseAnonKey),
} as const;
