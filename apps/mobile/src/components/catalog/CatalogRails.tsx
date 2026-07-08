import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  catalogApi,
  type ResolvedCatalogRail,
  type CatalogRailSurface,
} from '@/infrastructure/api/modules/catalog.api';
import { railLinkToMobileHref } from '@/core/catalog/rail-link';
import { favoritesApi, recommendationApi, watchApi } from '@/infrastructure/api';
import { ContinueWatchingRow } from '@/components/catalog/ContinueWatchingRow';
import { ContentRow } from '@/components/content/ContentRow';
import { ContentRowSkeleton } from '@/components/content/ContentRowSkeleton';
import type { ContentItem } from '@/components/content/ContentCard';
import { useCatalogMaturityFilter } from '@/presentation/hooks/use-catalog-maturity-filter';
import { useAuthStore } from '@/store/auth.store';
import { useProfileReady } from '@/presentation/hooks/use-profile-ready';
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
  const { profileId, isProfileReady } = useProfileReady();
  const catalogMaturity = useCatalogMaturityFilter();

  const { data: rails, isLoading: railsLoading } = useQuery({
    queryKey: ['catalog-rails-resolved', surface, catalogMaturity],
    queryFn: () => catalogApi.getResolvedRails(surface, catalogMaturity),
    staleTime: 60_000,
  });

  const railList = (rails ?? []) as ResolvedCatalogRail[];
  const visible = railList.filter((r) => !r.requiresAuth || isAuth);

  const { data: historyData } = useQuery({
    queryKey: ['watch-history-rails', profileId, surface],
    queryFn: () => watchApi.getHistory(profileId!, 1, 20),
    enabled: isProfileReady && (surface === 'home' || surface === 'series'),
    staleTime: 60_000,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites-rails', surface, profileId],
    queryFn: () => favoritesApi.list(1, profileId!, 16),
    enabled: isProfileReady && surface === 'home',
    staleTime: 30_000,
  });

  const { data: recoData } = useQuery({
    queryKey: ['recommendations-rails', surface, profileId],
    queryFn: () => recommendationApi.list(profileId!, 16),
    enabled: isProfileReady && surface === 'home',
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

  if (railsLoading) {
    return <ContentRowSkeleton title="Chargement…" />;
  }

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
            if (!tonight.length && rail.hideIfEmpty !== false) return null;
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
            if (!unfinished.length && rail.hideIfEmpty !== false) return null;
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
            if (!favoriteItems.length && rail.hideIfEmpty !== false) return null;
            return (
              <ContentRow
                key={rail.id}
                title={rail.title}
                items={favoriteItems}
                cardWidth={128}
                moreHref={moreHref}
                emptyMessage={rail.hideIfEmpty === false ? 'Aucun contenu disponible pour l’instant.' : undefined}
              />
            );
          }
          if (rail.personalizedKind === 'recommendations') {
            if (!recoItems.length && rail.hideIfEmpty !== false) return null;
            return (
              <ContentRow
                key={rail.id}
                title={rail.title}
                items={recoItems}
                cardWidth={128}
                moreHref={moreHref}
                emptyMessage={rail.hideIfEmpty === false ? 'Aucun contenu disponible pour l’instant.' : undefined}
              />
            );
          }
          return null;
        }

        if (rail.type === 'editorial' && !rail.contentIds?.length) {
          if (rail.hideIfEmpty === false) {
            return (
              <ContentRow
                key={rail.id}
                title={rail.title}
                items={[]}
                cardWidth={128}
                moreHref={moreHref}
                emptyMessage="Aucun contenu disponible pour l’instant."
              />
            );
          }
          return null;
        }

        if (rail.type === 'query' || rail.type === 'editorial') {
          const rawItems = mapItems({ items: rail.items });
          const items = excludeContentId
            ? rawItems.filter((item) => item.id !== excludeContentId)
            : rawItems;
          if (!items.length && rail.hideIfEmpty !== false) return null;
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
              emptyMessage={rail.hideIfEmpty === false ? 'Aucun contenu disponible pour l’instant.' : undefined}
            />
          );
        }

        return null;
      })}
    </View>
  );
}
