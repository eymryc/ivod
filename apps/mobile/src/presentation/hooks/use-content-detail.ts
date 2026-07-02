/**
 * Hook useContentDetail — Données complètes d'un contenu.
 *
 * Encapsule toutes les queries nécessaires à la page de détail :
 * - Contenu + métadonnées (contentApi.getOne)
 * - Droits d'accès (contentApi.getEntitlement)
 * - Statut favori (favoriteApi.getStatus)
 * - Saisons + épisodes si c'est une série (contentApi.getSeasons)
 * - Historique pour la reprise (watchApi.getHistory)
 *
 * Applique le principe ISP (Interface Segregation) : les composants
 * reçoivent exactement ce qu'ils ont besoin via des propriétés nommées.
 */

import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/infrastructure/api/modules/content.api';
import { favoriteApi } from '@/infrastructure/api/modules/favorite.api';
import { watchApi } from '@/infrastructure/api/modules/watch.api';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import type { PromoVideosBundle } from '@/core/entities/promo.entity';
import {
  isSeries,
  resolveResumeForContent,
  canResumeSession,
} from '@/core/entities';
import { contentPosterUrl } from '@/utils/assets';
import { subscriptionApi } from '@/infrastructure/api/modules/subscription.api';
import { isPaidPlan } from '@/core/constants/monetization';
import {
  resolveSeriesPlayTarget,
  formatSeriesPlayLabel,
  type SeriesPlayTarget,
} from '@/presentation/utils/series-play';
import type {
  Content,
  Entitlement,
  Season,
  WatchHistoryEntry,
  WatchHistoryEntry as ResumeEntry,
} from '@/core/entities';

export interface UseContentDetailResult {
  // ── Données ──────────────────────────────────────────────────────────────
  content: Content | undefined;
  entitlement: Entitlement | undefined;
  isFavorite: boolean;
  seasons: Season[];
  resume: ResumeEntry | null;

  // ── Dérivés calculés ─────────────────────────────────────────────────────
  posterUrl: string | null;
  isSerie: boolean;
  /** L'utilisateur peut lancer la lecture (SVOD ou AVOD). */
  canPlay: boolean;
  /** Le contenu est en mode AVOD (publicité obligatoire). */
  isAvod: boolean;
  /** Achat à l'unité requis (TVOD). */
  isTvod: boolean;
  ppvPrice: number | null;
  isGeoBlocked: boolean;
  needsSubscription: boolean;
  promoVideos: PromoVideosBundle | undefined;
  comingSoon: boolean;
  hasResume: boolean;
  canDownload: boolean;
  seriesPlayTarget: SeriesPlayTarget | null;
  seriesPlayLabel: string | undefined;
  watchHistoryItems: WatchHistoryEntry[];
  videoQuality: 'SD' | 'HD' | 'FHD' | '4K' | null;

  // ── États de chargement ───────────────────────────────────────────────────
  isLoading: boolean;
  isError: boolean;
}

/**
 * @param contentId - Identifiant du contenu à afficher.
 *
 * @example
 *   const { content, canPlay, resume, seasons } = useContentDetail(id);
 */
export function useContentDetail(contentId: string | undefined): UseContentDetailResult {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);

  // ── Query : contenu principal ─────────────────────────────────────────────
  const {
    data: content,
    isLoading,
    isError,
  } = useQuery({
    queryKey: QueryKeys.content.detail(contentId ?? '', profileId),
    queryFn: () => contentApi.getOne(contentId!, profileId ?? undefined),
    enabled: !!contentId,
  });

  // ── Query : droits d'accès (auth requise) ─────────────────────────────────
  const { data: entitlement } = useQuery({
    queryKey: QueryKeys.content.entitlement(contentId ?? '', profileId),
    queryFn: () => contentApi.getEntitlement(contentId!, profileId ?? undefined),
    enabled: !!contentId && isAuth,
  });

  // ── Query : statut favori ─────────────────────────────────────────────────
  const { data: favStatus } = useQuery({
    queryKey: QueryKeys.favorites.status(contentId ?? '', profileId),
    queryFn: () => favoriteApi.getStatus(contentId!, profileId ?? undefined),
    enabled: !!contentId && isAuth,
  });

  // ── Query : saisons (séries uniquement) ───────────────────────────────────
  const isSerie = content ? isSeries(content) : false;
  const { data: seasons } = useQuery({
    queryKey: QueryKeys.content.seasons(contentId ?? ''),
    queryFn: () => contentApi.getSeasons(contentId!),
    enabled: !!contentId && isSerie,
  });

  // ── Query : historique pour reprise ───────────────────────────────────────
  const { data: historyData } = useQuery({
    queryKey: QueryKeys.watch.history(profileId),
    queryFn: () => watchApi.getHistory(profileId ?? undefined, 1, 20),
    enabled: isAuth,
  });

  const { data: currentSub } = useQuery({
    queryKey: ['subscription-me'],
    queryFn: () => subscriptionApi.getActive(),
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  // ── Calculs dérivés ───────────────────────────────────────────────────────
  const historyItems = (historyData?.items ?? []) as WatchHistoryEntry[];
  const resume = contentId
    ? resolveResumeForContent(contentId, historyItems, content?.userProgress ?? null)
    : null;

  const hasAccess = entitlement?.hasAccess === true || entitlement?.canPlay === true;
  const isGeoBlocked = entitlement?.reason === 'GEO_BLOCKED';
  const isTvod = entitlement?.reason === 'TVOD' && !hasAccess;
  const ppvPrice =
    entitlement?.ppvPrice ??
    (content as { ppvPrice?: number | null } | undefined)?.ppvPrice ??
    null;
  const isAvod = entitlement?.reason === 'AVOD';
  const canPlay = hasAccess;
  const needsSubscription =
    !hasAccess && !isTvod && !isGeoBlocked && entitlement?.reason === 'SVOD';

  const hasResume = canResumeSession(resume);

  const planCode =
    currentSub?.planDetails?.code ?? currentSub?.plan ?? currentSub?.planCode ?? 'FREE';

  const seriesPlayTarget =
    isSerie && (seasons ?? []).length > 0
      ? resolveSeriesPlayTarget(seasons as Season[], hasResume ? resume : null)
      : null;

  const canDownload =
    isPaidPlan(planCode) && (!isSerie || !!seriesPlayTarget?.episodeId);

  const seriesPlayLabel =
    seriesPlayTarget && canPlay
      ? formatSeriesPlayLabel(
          seriesPlayTarget,
          hasResume ? 'resume' : 'play',
          hasResume ? resume?.watchedSeconds : undefined,
        )
      : undefined;

  const videoHeight = (content as { videoAsset?: { height?: number } })?.videoAsset?.height;
  const videoQuality: 'SD' | 'HD' | 'FHD' | '4K' | null = !videoHeight
    ? null
    : videoHeight >= 2160
      ? '4K'
      : videoHeight >= 1080
        ? 'FHD'
        : videoHeight >= 720
          ? 'HD'
          : 'SD';

  return {
    content,
    entitlement,
    isFavorite: favStatus?.isFavorite ?? false,
    seasons: (seasons ?? []) as Season[],
    resume,

    posterUrl: content ? contentPosterUrl(content) : null,
    canDownload,
    seriesPlayTarget,
    seriesPlayLabel,
    watchHistoryItems: historyItems,
    videoQuality,
    isSerie,
    canPlay,
    isAvod,
    isTvod,
    ppvPrice: ppvPrice != null && ppvPrice > 0 ? ppvPrice : null,
    isGeoBlocked,
    needsSubscription,
    promoVideos: (content as { promoVideos?: PromoVideosBundle })?.promoVideos,
    comingSoon:
      !content ||
      (typeof (content as { status?: { code?: string } })?.status === 'object'
        ? (content as { status?: { code?: string } }).status?.code
        : (content as { status?: string }).status) !== 'PUBLISHED',
    hasResume,

    isLoading: isLoading && !content,
    isError,
  };
}
