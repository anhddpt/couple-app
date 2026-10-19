import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { getReactionText } from '@/features/interactions/reactions';
import { getInteractionHistory } from '@/services/supabase/api';
import { colors, radius, spacing } from '@/theme';
import type { InteractionHistoryItem } from '@/types/domain';

const pageSize = 20;

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<InteractionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const loadFirstPage = useCallback(async () => {
    setError('');
    const data = await getInteractionHistory(undefined, pageSize);
    setItems(data);
    setHasMore(data.length === pageSize);
  }, []);

  useEffect(() => {
    void loadFirstPage()
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : t('error.generic')))
      .finally(() => setLoading(false));
  }, [loadFirstPage, t]);

  async function refresh() {
    try {
      setRefreshing(true);
      await loadFirstPage();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    const last = items.at(-1);
    if (!last || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const data = await getInteractionHistory({ createdAt: last.created_at, id: last.id }, pageSize);
      setItems((current) => [...current, ...data]);
      setHasMore(data.length === pageSize);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {loading ? <AppText align="center">{t('common.loading')}</AppText> : null}
      {!loading && items.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="heading2" align="center">{t('history.emptyTitle')}</AppText>
          <AppText color="textSecondary" align="center">{t('history.emptyBody')}</AppText>
        </View>
      ) : null}
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="label">{item.sender_name}</AppText>
            <AppText variant="caption" color="textSecondary">
              {new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(item.created_at))}
            </AppText>
          </View>
          <AppText>{getReactionText(item.action_type, t)}</AppText>
        </View>
      ))}
      {error ? <AppText color="danger">{error}</AppText> : null}
      {hasMore && items.length > 0 ? (
        <AppButton
          label={t('history.loadMore')}
          variant="secondary"
          loading={loadingMore}
          onPress={loadMore}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing[3], padding: spacing[5], backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', gap: spacing[2] },
  card: {
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
});
