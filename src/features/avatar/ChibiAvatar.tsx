import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { outfitCatalog } from '@/features/space/catalog';
import { colors, radius, spacing } from '@/theme';
import type { AvatarConfig, AvatarPreset, CoupleOutfit, Mood } from '@/types/domain';

import { avatarCatalog, normalizeAvatarConfig } from './catalog';
import { avatarPresets, defaultAvatarConfigs } from './presets';

const moodFaces: Record<Exclude<Mood, 'happy'>, string> = {
  angry: 'ಠ 益 ಠ',
  sad: 'ಥ﹏ಥ',
};

type Props = {
  presetId: AvatarPreset;
  config?: AvatarConfig;
  mood: Mood;
  name: string;
  size?: number;
  onHeadPress?: () => void;
  onCheekPress?: () => void;
  onCheekLongPress?: () => void;
  onEyesPress?: () => void;
  onMouthPress?: () => void;
  onHeartPress?: () => void;
  coupleOutfit?: CoupleOutfit;
  testID?: string;
};

export function ChibiAvatar({
  presetId,
  config,
  mood,
  name,
  size = 132,
  onHeadPress,
  onCheekPress,
  onCheekLongPress,
  onEyesPress,
  onMouthPress,
  onHeartPress,
  coupleOutfit,
  testID,
}: Props) {
  const preset = avatarPresets[presetId];
  const resolved = normalizeAvatarConfig(config ?? defaultAvatarConfigs[presetId]);
  const skin = avatarCatalog.skin[resolved.skin as keyof typeof avatarCatalog.skin];
  const hair = avatarCatalog.hair[resolved.hair as keyof typeof avatarCatalog.hair];
  const eyes = avatarCatalog.eyes[resolved.eyes as keyof typeof avatarCatalog.eyes];
  const mouth = avatarCatalog.mouth[resolved.mouth as keyof typeof avatarCatalog.mouth];
  const outfit = avatarCatalog.outfit[resolved.outfit as keyof typeof avatarCatalog.outfit];
  const accessory = resolved.accessory
    ? avatarCatalog.accessory[resolved.accessory as keyof typeof avatarCatalog.accessory]
    : null;
  const headSize = size * 0.62;
  const face = mood === 'happy' ? `${eyes.face} ${mouth.value}` : moodFaces[mood];

  return (
    <View style={[styles.wrapper, { width: size }]} testID={testID}>
      <View
        accessibilityLabel={name}
        style={[
          styles.head,
          { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: skin.color },
        ]}
      >
        <View
          style={[
            styles.hair,
            {
              width: headSize,
              height: headSize * 0.42,
              borderTopLeftRadius: headSize / 2,
              borderTopRightRadius: headSize / 2,
              backgroundColor: hair.color,
            },
          ]}
        />
        <AppText style={styles.face}>{face}</AppText>
        {accessory ? <AppText style={styles.accessory}>{accessory.value}</AppText> : null}
        {onHeadPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name} head`}
            onPress={onHeadPress}
            style={styles.headHitbox}
          />
        ) : null}
        {onCheekPress || onCheekLongPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name} cheek`}
            delayLongPress={350}
            onPress={onCheekPress}
            onLongPress={onCheekLongPress}
            style={styles.cheekHitbox}
          />
        ) : null}
        {onEyesPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name} eyes`}
            onPress={onEyesPress}
            style={styles.eyesHitbox}
          />
        ) : null}
        {onMouthPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name} mouth`}
            onPress={onMouthPress}
            style={styles.mouthHitbox}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.body,
          { width: size * 0.66, height: size * 0.48, backgroundColor: outfit.color ?? preset.outfit },
        ]}
      />
      {coupleOutfit ? (
        <AppText style={[styles.outfitBadge, { color: outfitCatalog[coupleOutfit].color }]}>
          {outfitCatalog[coupleOutfit].symbol}
        </AppText>
      ) : null}
      {onHeartPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} heart`}
          onPress={onHeartPress}
          style={styles.heartHitbox}
        >
          <AppText color="primary">♥</AppText>
        </Pressable>
      ) : null}
      <AppText variant="label" align="center" numberOfLines={1}>
        {name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing[2] },
  head: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  hair: { position: 'absolute', top: 0 },
  face: { marginTop: spacing[3], fontSize: 15 },
  accessory: { position: 'absolute', right: 5, top: 4, color: colors.primary },
  headHitbox: { position: 'absolute', left: '20%', right: '20%', top: 0, height: '30%' },
  cheekHitbox: { position: 'absolute', right: 0, top: '40%', width: '30%', height: '30%' },
  eyesHitbox: { position: 'absolute', left: '22%', right: '22%', top: '30%', height: '22%' },
  mouthHitbox: { position: 'absolute', left: '32%', right: '32%', bottom: '12%', height: '20%' },
  heartHitbox: {
    position: 'absolute',
    right: '18%',
    top: '62%',
    width: 44,
    height: 44,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitBadge: { position: 'absolute', top: '62%', zIndex: 3, fontSize: 18 },
  body: {
    marginTop: -spacing[4],
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    borderBottomLeftRadius: radius.medium,
    borderBottomRightRadius: radius.medium,
  },
});
