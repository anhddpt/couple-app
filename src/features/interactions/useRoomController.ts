import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { defaultAvatarConfigs } from '@/features/avatar/presets';
import { getCoupleSpace } from '@/features/space/spaceApi';
import { useAuth } from '@/providers/AuthProvider';
import { registerForPushNotifications } from '@/services/notifications';
import { requireSupabase } from '@/services/supabase/client';
import type { CoupleSpace, Interaction, Mood } from '@/types/domain';

import {
  acknowledgeInteraction,
  peekLatestInteraction,
  sendInteraction,
  type InteractionIntent,
} from './interactionsApi';
import { updateMood } from '../profile/profileApi';

type IntentParams = Pick<InteractionIntent, 'targetType' | 'targetRegion' | 'gestureType'>;

export function useRoomController() {
  const { t } = useTranslation();
  const { session, profile, avatar, avatarState, couple, refresh } = useAuth();
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [space, setSpace] = useState<CoupleSpace | null>(null);
  const consumeInFlight = useRef(false);
  const consumeQueued = useRef(false);

  const consumeLatest = useCallback(async () => {
    if (consumeInFlight.current) {
      consumeQueued.current = true;
      return;
    }
    consumeInFlight.current = true;
    try {
      const interaction = await peekLatestInteraction();
      if (interaction) {
        setCurrentInteraction(interaction);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await acknowledgeInteraction(interaction.id);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      consumeInFlight.current = false;
      if (consumeQueued.current) {
        consumeQueued.current = false;
        void consumeLatest();
      }
    }
  }, [t]);

  useEffect(() => {
    if (!session || !couple) return;
    void registerForPushNotifications().catch(() => undefined);
    void consumeLatest();
    void getCoupleSpace().then(setSpace).catch(() => undefined);

    const client = requireSupabase();
    const interactionsChannel = client
      .channel(`interactions:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions', filter: `receiver_id=eq.${session.user.id}` },
        () => void consumeLatest(),
      )
      .subscribe();
    const moodChannel = client
      .channel(`partner-mood:${couple.partner_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'avatar_states', filter: `user_id=eq.${couple.partner_id}` },
        () => void refresh(),
      )
      .subscribe();
    const spaceChannel = client
      .channel(`couple-space:${couple.couple_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_spaces', filter: `couple_id=eq.${couple.couple_id}` },
        () => void getCoupleSpace().then(setSpace),
      )
      .subscribe();

    return () => {
      void client.removeChannel(interactionsChannel);
      void client.removeChannel(moodChannel);
      void client.removeChannel(spaceChannel);
    };
  }, [consumeLatest, couple, refresh, session]);

  async function sendIntent(params: IntentParams) {
    try {
      setLoadingAction(true);
      setError('');
      setCurrentInteraction(
        await sendInteraction({
          ...params,
          clientEventId: Crypto.randomUUID(),
          clientCreatedAt: new Date().toISOString(),
        }),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.actionBlocked'));
    } finally {
      setLoadingAction(false);
    }
  }

  async function selectMood(mood: Mood) {
    try {
      setError('');
      await updateMood(mood);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  const people = useMemo(() => {
    if (!session || !profile || !avatar || !couple) return null;
    return {
      me: {
        id: session.user.id,
        name: profile.display_name,
        preset: avatar.preset_id,
        config: avatar.config ?? defaultAvatarConfigs[avatar.preset_id],
        mood: avatarState?.current_mood ?? 'happy',
      },
      partner: {
        id: couple.partner_id,
        name: couple.partner_name,
        preset: couple.partner_avatar_preset,
        config: couple.partner_avatar_config ?? defaultAvatarConfigs[couple.partner_avatar_preset],
        mood: couple.partner_mood,
      },
    } as const;
  }, [avatar, avatarState, couple, profile, session]);

  return {
    couple,
    people,
    space,
    currentInteraction,
    setCurrentInteraction,
    loadingAction,
    error,
    sendIntent,
    selectMood,
  };
}
