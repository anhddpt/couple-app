import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ConfigRequired } from '@/components/ConfigRequired';
import { LoadingView } from '@/components/LoadingView';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexRoute() {
  const { t } = useTranslation();
  const { configured, loading, session, profile, avatar, couple } = useAuth();

  if (!configured) return <ConfigRequired />;
  if (loading) return <LoadingView label={t('common.loading')} />;
  if (!session) return <Redirect href="/(auth)" />;
  if (!profile) return <Redirect href="/(onboarding)/profile" />;
  if (profile.account_status === 'deactivated') return <Redirect href="/(onboarding)/reactivate" />;
  if (profile.account_status === 'deletion_pending') {
    return <Redirect href="/(onboarding)/deletion-pending" />;
  }
  if (!avatar) return <Redirect href="/(onboarding)/avatar" />;
  if (!couple) return <Redirect href="/(onboarding)/pairing" />;
  return <Redirect href="/(tabs)/room" />;
}
