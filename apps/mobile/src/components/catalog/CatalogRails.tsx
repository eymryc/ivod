import { View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  catalogApi,
  type CatalogRail,
  type CatalogRailSurface,
} from '@/infrastructure/api/modules/catalog.api';
import { railToListParams } from '@/core/catalog/rail-query';
import { railLinkToMobileHref } from '@/core/catalog/rail-link';
import {
  contentsApi,
  favoritesApi,
  recommendationApi,
  watchApi,
} from '@/infrastructure/api';
import { ContinueWatchingRow } from '@/components/catalog/ContinueWatchingRow';
import { ContentRow } from '@/components/content/ContentRow';
import { ContentRowSkeleton } from '@/components/content/ContentRowSkeleton';
import type { ContentItem } from '@/components/content/ContentCard';
import { useCatalogMaturityFilter } from '@/presentation/hooks/use-catalog-maturity-filter';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { dedupeContentById } from '@/utils/content-list';
import {
  filterResumeTonight,
  filterUnfinishedSeries,
  type RailHistoryItem,
} from '@/core/utils/resume-rails';

function mapItems(raw: unknown): ContentItem[] {
  const items = (raw as { items?: unknown[] })?.items ?? (Array.isArray(raw) ? raw : []);
  return dedupeContentById(items as ContentItem[]);
}

type Props = {
  surface: CatalogRailSurface;
  historyMap?: Record<string, number>;
  excludeContentId?: string;
};

export function CatalogRails({ surface, historyMap = {}, excludeContentId }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profile = useProfileStore((s) => s.getActiveProfile());
  const catalogMaturity = useCatalogMaturityFilter();

  const { data: rails, isLoading: railsLoading } = useQuery({
    queryKey: ['catalog-rails', surface],
    queryFn: () => catalogApi.getRails(surface),
    staleTime: 60 * 60_000,
  });

  const railList = (rails ?? []) as CatalogRail[];
  const visible = railList.filter((r) => !r.requiresAuth || isAuth);
  const fetchable = visible.filter(
    (r) => r.type === 'query' || (r.type === 'editorial' && (r.contentIds?.length ?? 0) > 0),
  );

  const { data: historyData } = useQuery({
    queryKey: ['watch-history-rails', profile?.id, surface],
    queryFn: () => watchApi.getHistory(profile?.id, 1, 20),
    enabled: isAuth && (surface === 'home' || surface === 'series'),
    staleTime: 60_000,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites-rails', surface, profile?.id],
    queryFn: () => favoritesApi.list(1, profile?.id, 16),
    enabled: isAuth && surface === 'home',
    staleTime: 30_000,
  });

  const { data: recoData } = useQuery({
    queryKey: ['recommendations-rails', surface],
    queryFn: () => recommendationApi.list(undefined, 16),
    enabled: isAuth && surface === 'home',
    staleTime: 5 * 60_000,
  });

  type HistoryRailItem = RailHistoryItem & {
    content?: ContentItem;
    resumePreview?: ContentItem['resumePreview'];
  };
  const historyItems = ((historyData as { items?: HistoryRailItem[] })?.items ?? []) as HistoryRailItem[];

  const favoriteItems = dedupeContentById(
    ((favoritesData as { items?: { content?: ContentItem }[] })?.items ?? [])
      .map((f) => f.content)
      .filter(Boolean) as ContentItem[],
  );

  const recoItems = mapItems(recoData);

  const contentQueries = useQueries({
    queries: fetchable.map((rail) => ({
      queryKey: [
        'catalog-rail-mobile',
        surface,
        rail.id,
        rail.type,
        rail.query,
        rail.contentIds,
        catalogMaturity,
        excludeContentId,
      ],
      queryFn: async () => {
        const raw =
          rail.type === 'editorial' && rail.contentIds?.length
            ? await contentsApi.list({
                ids: rail.contentIds.join(','),
                maxMaturityRating: catalogMaturity ?? undefined,
              })
            : await contentsApi.list(railToListParams(rail.query, catalogMaturity));
        const items = mapItems(raw);
        return excludeContentId
          ? items.filter((item) => item.id !== excludeContentId)
          : items;
      },
      enabled: !railsLoading,
      staleTime: 3 * 60_000,
    })),
  });

  if (railsLoading) {
    return <ContentRowSkeleton title="Chargement…" />;
  }

  let queryIdx = 0;

  return (
    <View>
      {visible.map((rail) => {
        const moreHref = railLinkToMobileHref(rail.link);

        if (rail.type === 'personalized') {
          if (rail.personalizedKind === 'continue_watching') {
            return (
              <ContinueWatchingRow
                key={rail.id}
                title={rail.title}
                sessions={historyItems}
                moreHref={moreHref}
              />
            );
          }
          if (rail.personalizedKind === 'resume_tonight') {
            const tonight = filterResumeTonight(historyItems);
            if (!tonight.length) return null;
            return (
              <ContinueWatchingRow
                key={rail.id}
                title={rail.title}
                sessions={tonight}
                moreHref={moreHref}
              />
            );
          }
          if (rail.personalizedKind === 'unfinished') {
            const unfinished = filterUnfinishedSeries(historyItems);
            if (!unfinished.length) return null;
            return (
              <ContinueWatchingRow
                key={rail.id}
                title={rail.title}
                sessions={unfinished}
                moreHref={moreHref}
              />
            );
          }
          if (rail.personalizedKind === 'my_list') {
            if (!favoriteItems.length) return null;
            return (
              <ContentRow
                key={rail.id}
                title={rail.title}
                items={favoriteItems}
                cardWidth={128}
                moreHref={moreHref}
              />
            );
          }
          if (rail.personalizedKind === 'recommendations') {
            if (!recoItems.length) return null;
            return (
              <ContentRow
                key={rail.id}
                title={rail.title}
                items={recoItems}
                cardWidth={128}
                moreHref={moreHref}
              />
            );
          }
          return null;
        }

        if (rail.type === 'editorial' && !rail.contentIds?.length) return null;

        if (rail.type === 'query' || rail.type === 'editorial') {
          const q = contentQueries[queryIdx++];
          if (q.isLoading) {
            return <ContentRowSkeleton key={rail.id} title={rail.title} />;
          }
          const items = q.data ?? [];
          if (!items.length) return null;
          const withProgress = items.map((item) => ({
            ...item,
            progress: item.progress ?? historyMap[item.id],
          }));
          return (
            <ContentRow
              key={rail.id}
              title={rail.title}
              items={withProgress}
              cardWidth={128}
              moreHref={moreHref}
            />
          );
        }

        return null;
      })}
    </View>
  );
}
