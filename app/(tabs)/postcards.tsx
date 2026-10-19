import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { generatePostcard } from '@/features/postcards/postcardApi';
import { colors, radius, spacing } from '@/theme';

const occasions = ['anniversary', 'miss_you', 'date_night'] as const;
type Occasion = (typeof occasions)[number];

export default function PostcardsScreen() {
  const { t } = useTranslation();
  const [occasion, setOccasion] = useState<Occasion>('anniversary');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    try {
      setLoading(true);
      setError('');
      setImage(await generatePostcard(occasion));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <AppText variant="heading1">{t('postcard.heading')}</AppText>
      <AppText color="textSecondary">{t('postcard.description')}</AppText>
      <View style={styles.options}>
        {occasions.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: occasion === item }}
            key={item}
            onPress={() => setOccasion(item)}
            style={[styles.option, occasion === item && styles.selected]}
          >
            <AppText variant="label">{t(`postcard.${item}`)}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.preview}>
        {image ? (
          <Image accessibilityLabel={t('postcard.generated')} source={{ uri: image }} style={styles.image} />
        ) : (
          <AppText color="textSecondary" align="center">{t('postcard.placeholder')}</AppText>
        )}
      </View>
      {error ? <AppText color="danger">{error}</AppText> : null}
      <AppButton label={t('postcard.generate')} loading={loading} onPress={generate} />
      <AppText variant="caption" color="textSecondary">{t('postcard.privacy')}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  option: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.accent },
  preview: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: '100%' },
});
