import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { LoadingView } from '@/components/LoadingView';
import { Screen } from '@/components/Screen';
import { InteractionScene } from '@/features/interactions/InteractionScene';
import { defaultAvatarConfigs } from '@/features/avatar/presets';
import { useAuth } from '@/providers/AuthProvider';
import { registerForPushNotifications } from '@/services/notifications';
import {
  acknowledgeInteraction,
  peekLatestInteraction,
  sendInteraction,
  updateMood,
} from '@/services/supabase/api';
import { requireSupabase } from '@/services/supabase/client';
import { colors, radius, spacing } from '@/theme';
import type { Interaction, Mood } from '@/types/domain';
import { moods } from '@/types/domain';

const moodLabels: Record<Mood, string> = {
  happy: 'room.happy',
  angry: 'room.angry',
  sad: 'room.sad',
};

export default function RoomScreen() {
  const { t } = useTranslation();
  const { session, profile, avatar, avatarState, couple, refresh } = useAuth();
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
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

    const client = requireSupabase();
    const interactionsChannel = client
      .channel(`interactions:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interactions',
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => void consumeLatest(),
      )
      .subscribe();

    const moodChannel = client
      .channel(`partner-mood:${couple.partner_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'avatar_states',
          filter: `user_id=eq.${couple.partner_id}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(interactionsChannel);
      void client.removeChannel(moodChannel);
    };
  }, [consumeLatest, couple, refresh, session]);

  async function sendIntent(params: {
    targetType: 'partner' | 'self';
    targetRegion: 'head' | 'cheek' | 'body' | 'self_eyes' | 'self_mouth' | 'self_heart';
    gestureType: 'tap' | 'long_press' | 'drag_together';
  }) {
    try {
      setLoadingAction(true);
      setError('');
      const interaction = await sendInteraction({
        ...params,
        clientEventId: Crypto.randomUUID(),
        clientCreatedAt: new Date().toISOString(),
      });
      setCurrentInteraction(interaction);
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
        config:
          couple.partner_avatar_config ?? defaultAvatarConfigs[couple.partner_avatar_preset],
        mood: couple.partner_mood,
      },
    } as const;
  }, [avatar, avatarState, couple, profile, session]);

  if (!couple) {
    return (
      <Screen style={styles.center}>
        <AppText align="center">{t('room.noPartner')}</AppText>
        <AppButton label={t('onboarding.pairingTitle')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (!people) return <LoadingView label={t('common.loading')} />;

  return (
    <Screen>
      <View style={styles.moods}>
        <AppText variant="label">{t('room.mood')}</AppText>
        <View style={styles.moodOptions}>
          {moods.map((mood) => {
            const selected = people.me.mood === mood;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={mood}
                onPress={() => selectMood(mood)}
                style={[styles.moodChip, selected && styles.moodChipSelected]}
              >
                <AppText variant="label" color={selected ? 'surface' : 'textPrimary'}>
                  {t(moodLabels[mood])}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <InteractionScene
        interaction={currentInteraction}
        me={people.me}
        partner={people.partner}
        onPartnerHeadPress={
          couple.partner_available
            ? () => sendIntent({ targetType: 'partner', targetRegion: 'head', gestureType: 'tap' })
            : undefined
        }
        onPartnerCheekPress={
          couple.partner_available
            ? () => sendIntent({ targetType: 'partner', targetRegion: 'cheek', gestureType: 'tap' })
            : undefined
        }
        onPartnerCheekLongPress={
          couple.partner_available
            ? () =>
                sendIntent({ targetType: 'partner', targetRegion: 'cheek', gestureType: 'long_press' })
            : undefined
        }
        onSelfEyesPress={() =>
          sendIntent({ targetType: 'self', targetRegion: 'self_eyes', gestureType: 'tap' })
        }
        onSelfMouthPress={() =>
          sendIntent({ targetType: 'self', targetRegion: 'self_mouth', gestureType: 'tap' })
        }
        onSelfHeartPress={() =>
          sendIntent({ targetType: 'self', targetRegion: 'self_heart', gestureType: 'tap' })
        }
      />

      {!couple.partner_available ? (
        <AppText color="textSecondary" align="center">
          Partner hiện đang tạm vô hiệu hóa tài khoản.
        </AppText>
      ) : null}

      <View style={styles.intentGrid}>
        <AppButton
          label={t('room.headIntent')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'partner', targetRegion: 'head', gestureType: 'tap' })
          }
        />
        <AppButton
          label={t('room.cheekPoke')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'partner', targetRegion: 'cheek', gestureType: 'tap' })
          }
        />
        <AppButton
          label={t('room.kiss')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'partner', targetRegion: 'cheek', gestureType: 'long_press' })
          }
        />
        <AppButton
          label={t('room.hug')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({
              targetType: 'partner',
              targetRegion: 'body',
              gestureType: 'drag_together',
            })
          }
        />
        <AppButton
          label={t('room.sleepy')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'self', targetRegion: 'self_eyes', gestureType: 'tap' })
          }
        />
        <AppButton
          label={t('room.hungry')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'self', targetRegion: 'self_mouth', gestureType: 'tap' })
          }
        />
        <AppButton
          label={t('room.missYou')}
          variant="secondary"
          style={styles.intentButton}
          loading={loadingAction}
          disabled={!couple.partner_available}
          onPress={() =>
            sendIntent({ targetType: 'self', targetRegion: 'self_heart', gestureType: 'tap' })
          }
        />
      </View>
      {error ? <AppText color="danger">{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  moods: { gap: spacing[2] },
  moodOptions: { flexDirection: 'row', gap: spacing[2] },
  moodChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moodChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  intentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  intentButton: { flexGrow: 1, flexBasis: '47%' },
});
