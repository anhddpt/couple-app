import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { LoadingView } from '@/components/LoadingView';
import { Screen } from '@/components/Screen';
import { InteractionScene } from '@/features/interactions/InteractionScene';
import { useRoomController } from '@/features/interactions/useRoomController';
import { roomThemeCatalog } from '@/features/space/catalog';
import { SharedPet } from '@/features/space/SharedPet';
import { VoicePlayback } from '@/features/voice/VoicePlayback';
import { VoiceRecorderButton } from '@/features/voice/VoiceRecorderButton';
import { colors, radius, spacing } from '@/theme';
import type { Mood } from '@/types/domain';
import { moods } from '@/types/domain';

const moodLabels: Record<Mood, string> = {
  happy: 'room.happy',
  angry: 'room.angry',
  sad: 'room.sad',
};

export default function RoomScreen() {
  const { t } = useTranslation();
  const {
    couple,
    people,
    space,
    currentInteraction,
    setCurrentInteraction,
    loadingAction,
    error,
    sendIntent,
    selectMood,
  } = useRoomController();

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
    <Screen style={space ? { backgroundColor: roomThemeCatalog[space.room_theme].background } : undefined}>
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
        coupleOutfit={space?.couple_outfit}
      />

      {space ? <SharedPet space={space} /> : null}

      {currentInteraction?.action_type === 'VOICE' ? (
        <VoicePlayback interactionId={currentInteraction.id} />
      ) : null}

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
      <VoiceRecorderButton onSent={setCurrentInteraction} />
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
