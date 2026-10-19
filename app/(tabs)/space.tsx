import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { LoadingView } from '@/components/LoadingView';
import { Screen } from '@/components/Screen';
import { outfitCatalog, petCatalog, roomThemeCatalog } from '@/features/space/catalog';
import { SharedPet } from '@/features/space/SharedPet';
import { careForPet, getCoupleSpace, updateCoupleSpace } from '@/services/supabase/api';
import { colors, radius, spacing } from '@/theme';
import type { CoupleOutfit, CoupleSpace, PetType, RoomTheme } from '@/types/domain';
import { coupleOutfits, petTypes, roomThemes } from '@/types/domain';

export default function SpaceScreen() {
  const { t } = useTranslation();
  const [space, setSpace] = useState<CoupleSpace | null>(null);
  const [roomTheme, setRoomTheme] = useState<RoomTheme>('sunset');
  const [petType, setPetType] = useState<PetType>('cat');
  const [petName, setPetName] = useState('Mochi');
  const [outfit, setOutfit] = useState<CoupleOutfit>('classic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void getCoupleSpace()
      .then((value) => {
        setSpace(value);
        setRoomTheme(value.room_theme);
        setPetType(value.pet_type);
        setPetName(value.pet_name);
        setOutfit(value.couple_outfit);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : t('error.generic')))
      .finally(() => setLoading(false));
  }, [t]);

  async function save() {
    try {
      setSaving(true);
      setError('');
      setSpace(await updateCoupleSpace({ roomTheme, petType, petName, coupleOutfit: outfit }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setSaving(false);
    }
  }

  async function care() {
    try {
      setSpace(await careForPet());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    }
  }

  if (loading) return <LoadingView label={t('common.loading')} />;

  return (
    <Screen scroll>
      {space ? <SharedPet space={{ ...space, pet_type: petType, pet_name: petName }} /> : null}
      <AppButton label={t('space.care')} variant="secondary" onPress={care} />

      <AppText variant="heading2">{t('space.roomTheme')}</AppText>
      <View style={styles.options}>
        {roomThemes.map((theme) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: roomTheme === theme }}
            key={theme}
            onPress={() => setRoomTheme(theme)}
            style={[styles.option, roomTheme === theme && styles.selected]}
          >
            <View style={[styles.swatch, { backgroundColor: roomThemeCatalog[theme].background }]} />
            <AppText variant="caption">{t(roomThemeCatalog[theme].labelKey)}</AppText>
          </Pressable>
        ))}
      </View>

      <AppText variant="heading2">{t('space.pet')}</AppText>
      <View style={styles.options}>
        {petTypes.map((type) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: petType === type }}
            key={type}
            onPress={() => setPetType(type)}
            style={[styles.option, petType === type && styles.selected]}
          >
            <AppText variant="heading2">{petCatalog[type].symbol}</AppText>
            <AppText variant="caption">{t(petCatalog[type].labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      <AppInput label={t('space.petName')} maxLength={24} value={petName} onChangeText={setPetName} />

      <AppText variant="heading2">{t('space.coupleOutfit')}</AppText>
      <View style={styles.options}>
        {coupleOutfits.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: outfit === item }}
            key={item}
            onPress={() => setOutfit(item)}
            style={[styles.option, outfit === item && styles.selected]}
          >
            <AppText variant="heading2" style={{ color: outfitCatalog[item].color }}>
              {outfitCatalog[item].symbol}
            </AppText>
            <AppText variant="caption">{t(outfitCatalog[item].labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      {error ? <AppText color="danger">{error}</AppText> : null}
      <AppButton label={t('common.save')} loading={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  option: {
    minWidth: 90,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    padding: spacing[2],
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  swatch: { width: 42, height: 30, borderRadius: radius.small, borderWidth: 1, borderColor: colors.border },
});
