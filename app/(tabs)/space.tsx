import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { LoadingView } from '@/components/LoadingView';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { outfitCatalog, petCatalog, roomThemeCatalog } from '@/features/space/catalog';
import { SharedPet } from '@/features/space/SharedPet';
import { useCoupleSpaceEditor } from '@/features/space/useCoupleSpaceEditor';
import { colors, radius, spacing } from '@/theme';
import { coupleOutfits, petTypes, roomThemes } from '@/types/domain';

export default function SpaceScreen() {
  const { t } = useTranslation();
  const { couple } = useAuth();
  const {
    space,
    draft,
    loading,
    saving,
    error,
    hasConflict,
    updateDraft,
    save,
    care,
    reloadAfterConflict,
  } = useCoupleSpaceEditor(couple?.couple_id ?? '', t('error.generic'));

  if (loading) return <LoadingView label={t('common.loading')} />;

  return (
    <Screen scroll>
      {space ? (
        <SharedPet space={{ ...space, pet_type: draft.petType, pet_name: draft.petName }} />
      ) : null}
      <AppButton label={t('space.care')} variant="secondary" disabled={hasConflict} onPress={care} />

      <AppText variant="heading2">{t('space.roomTheme')}</AppText>
      <View style={styles.options}>
        {roomThemes.map((theme) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: draft.roomTheme === theme }}
            key={theme}
            onPress={() => updateDraft({ roomTheme: theme })}
            style={[styles.option, draft.roomTheme === theme && styles.selected]}
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
            accessibilityState={{ checked: draft.petType === type }}
            key={type}
            onPress={() => updateDraft({ petType: type })}
            style={[styles.option, draft.petType === type && styles.selected]}
          >
            <AppText variant="heading2">{petCatalog[type].symbol}</AppText>
            <AppText variant="caption">{t(petCatalog[type].labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      <AppInput
        label={t('space.petName')}
        maxLength={24}
        value={draft.petName}
        onChangeText={(petName) => updateDraft({ petName })}
      />

      <AppText variant="heading2">{t('space.coupleOutfit')}</AppText>
      <View style={styles.options}>
        {coupleOutfits.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: draft.coupleOutfit === item }}
            key={item}
            onPress={() => updateDraft({ coupleOutfit: item })}
            style={[styles.option, draft.coupleOutfit === item && styles.selected]}
          >
            <AppText variant="heading2" style={{ color: outfitCatalog[item].color }}>
              {outfitCatalog[item].symbol}
            </AppText>
            <AppText variant="caption">{t(outfitCatalog[item].labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      {error ? <AppText color="danger">{error}</AppText> : null}
      {hasConflict ? (
        <AppButton
          label={t('space.reloadConflict')}
          variant="secondary"
          onPress={reloadAfterConflict}
        />
      ) : null}
      <AppButton label={t('common.save')} loading={saving} disabled={hasConflict} onPress={save} />
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
