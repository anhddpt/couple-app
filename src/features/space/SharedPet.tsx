import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';
import type { CoupleSpace } from '@/types/domain';

import { petCatalog } from './catalog';

export function SharedPet({ space }: { space: CoupleSpace }) {
  const bounce = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    bounce.value = reduceMotion ? 0 : withRepeat(withTiming(-5, { duration: 850 }), -1, true);
  }, [bounce, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  const pet = petCatalog[space.pet_type];

  return (
    <Animated.View style={[styles.card, style]}>
      <AppText variant="heading2" align="center">{pet.symbol}</AppText>
      <View>
        <AppText variant="label" align="center">{space.pet_name}</AppText>
        <AppText variant="caption" color="textSecondary" align="center">
          Lv. {Math.floor(space.pet_xp / 5) + 1} · {space.pet_mood}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    minWidth: 110,
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
