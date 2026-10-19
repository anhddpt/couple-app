import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { ChibiAvatar } from '@/features/avatar/ChibiAvatar';
import { colors, radius, spacing } from '@/theme';
import type { AvatarConfig, AvatarPreset, CoupleOutfit, Interaction, Mood } from '@/types/domain';

import { getReactionText } from './reactions';

type Person = { id: string; name: string; preset: AvatarPreset; config: AvatarConfig; mood: Mood };

type Props = {
  interaction: Interaction | null;
  me: Person;
  partner: Person;
  onPartnerHeadPress?: () => void;
  onPartnerCheekPress?: () => void;
  onPartnerCheekLongPress?: () => void;
  onSelfEyesPress?: () => void;
  onSelfMouthPress?: () => void;
  onSelfHeartPress?: () => void;
  coupleOutfit?: CoupleOutfit;
};

export function InteractionScene({
  interaction,
  me,
  partner,
  onPartnerHeadPress,
  onPartnerCheekPress,
  onPartnerCheekLongPress,
  onSelfEyesPress,
  onSelfMouthPress,
  onSelfHeartPress,
  coupleOutfit,
}: Props) {
  const { t } = useTranslation();
  const actorMove = useSharedValue(0);
  const targetMove = useSharedValue(0);
  const targetScale = useSharedValue(1);
  const effectScale = useSharedValue(0);

  const senderIsMe = !interaction || interaction.sender_id === me.id;
  const actor = senderIsMe ? me : partner;
  const receiver = senderIsMe ? partner : me;
  const actorMood = interaction?.actor_mood ?? actor.mood;

  useEffect(() => {
    if (!interaction) return;
    const direction = senderIsMe ? 1 : -1;
    const distance = interaction.action_type === 'HUG' || interaction.action_type === 'KISS' ? 34 : 18;
    actorMove.value = withSequence(
      withTiming(direction * distance, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 360 }),
    );
    if (['BONK', 'PUSH_AWAY'].includes(interaction.action_type)) {
      targetMove.value = withSequence(
        withTiming(direction * 10, { duration: 90 }),
        withTiming(direction * -8, { duration: 90 }),
        withTiming(0, { duration: 160 }),
      );
    }
    if (interaction.action_type === 'CHEEK_POKE') {
      targetScale.value = withSequence(withTiming(0.94, { duration: 120 }), withTiming(1, { duration: 220 }));
    }
    if (['KISS', 'MISS_YOU', 'SLEEPY'].includes(interaction.action_type)) {
      effectScale.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 650 }));
    }
  }, [actorMove, effectScale, interaction, senderIsMe, targetMove, targetScale]);

  const actorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: actorMove.value }] }));
  const targetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: targetMove.value }, { scale: targetScale.value }],
  }));
  const effectStyle = useAnimatedStyle(() => ({
    opacity: effectScale.value,
    transform: [{ scale: effectScale.value }],
  }));

  const left = senderIsMe ? actor : receiver;
  const right = senderIsMe ? receiver : actor;

  function avatarProps(person: Person) {
    return {
      name: person.name,
      presetId: person.preset,
      config: person.config,
      mood: person.id === actor.id ? actorMood : person.mood,
      onHeadPress: person.id === partner.id ? onPartnerHeadPress : undefined,
      onCheekPress: person.id === partner.id ? onPartnerCheekPress : undefined,
      onCheekLongPress: person.id === partner.id ? onPartnerCheekLongPress : undefined,
      onEyesPress: person.id === me.id ? onSelfEyesPress : undefined,
      onMouthPress: person.id === me.id ? onSelfMouthPress : undefined,
      onHeartPress: person.id === me.id ? onSelfHeartPress : undefined,
      coupleOutfit,
    };
  }

  const effect = interaction?.action_type === 'SLEEPY' ? 'Zzz' : interaction?.action_type === 'KISS' ? '♥' : '♡';

  return (
    <View style={styles.wrapper}>
      {interaction ? (
        <View style={styles.bubble}>
          <AppText variant="bodySmall" align="center">
            {getReactionText(interaction.action_type, t)}
          </AppText>
        </View>
      ) : null}
      <View style={styles.people}>
        <Animated.View style={senderIsMe ? actorStyle : targetStyle}>
          <ChibiAvatar {...avatarProps(left)} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.effect, effectStyle]}>
          <AppText variant="heading1" color="primary">{effect}</AppText>
        </Animated.View>
        <Animated.View style={senderIsMe ? targetStyle : actorStyle}>
          <ChibiAvatar {...avatarProps(right)} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'center', gap: spacing[4] },
  people: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  effect: { position: 'absolute', alignSelf: 'center', top: '20%', zIndex: 5 },
  bubble: {
    alignSelf: 'center',
    maxWidth: 240,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
