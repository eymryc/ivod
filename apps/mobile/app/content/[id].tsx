/**
 * Écran de détail d'un contenu.
 *
 * Responsabilité unique : composer l'UI à partir des données fournies
 * par le hook useContentDetail. Toute la logique métier est externalisée.
 *
 * Structure de l'écran :
 * - Hero image avec gradient et badge de monétisation
 * - Informations principales (titre, créateur, actions)
 * - Vidéos promo (teaser, BA, extras) via PromoVideoBar
 * - Liste des saisons/épisodes (séries)
 * - Sections : récompenses, équipe, contenus similaires, avis, commentaires
 * - Modal signalement
 */


import { useState, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { toast } from '@/presentation/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Download, Share2, Flag, ThumbsUp, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { formatXOF } from '@/core/pricing/format';
import { TvodPurchaseModal } from '@/components/payment/TvodPurchaseModal';
import { useLike } from '@/presentation/hooks/use-like';
import { useContentDetail } from '@/presentation/hooks/use-content-detail';
import { useFavorite } from '@/presentation/hooks/use-favorite';
import { useDownload } from '@/presentation/hooks/use-download';
import { getOfflineByContentId } from '@/infrastructure/services/offline-storage';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import { useScreenFocusRefetch } from '@/presentation/hooks/use-screen-focus-refetch';
import { useContentTypes } from '@/hooks/use-content-types';
import { getTypeLabel } from '@/core/catalog/content-types';
import {
  buildWatchHref,
  canResumeSession,
  formatResumeLabel,
} from '@/core/entities';
import { buildSharePayload } from '@/core/share/build-share-payload';

import { ContentHero } from '@/components/content/ContentHero';
import { ContentBadges } from '@/components/content/ContentBadges';
import { ExpandableDescription } from '@/components/content/ExpandableDescription';
import { PromoExtrasSection } from '@/components/content/PromoExtrasSection';
import { CommentsSection } from '@/components/content/CommentsSection';
import { ReviewsSection } from '@/components/content/ReviewsSection';
import { SeasonEpisodeList } from '@/components/content/SeasonEpisodeList';
import { SimilarContentRow } from '@/components/content/SimilarContentRow';
import { CrewSection } from '@/components/content/CrewSection';
import { AwardsSection } from '@/components/content/AwardsSection';
import { ReportModal } from '@/components/content/ReportModal';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import type { WatchHistoryEntry, Season } from '@/core/entities';
import { contentResumeHeroUrl, resolveEpisodeThumbnailUrl } from '@/utils/assets';

// ─── Écran principal ────────────────────────────────────────────────────────

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const { labelMap } = useContentTypes();

  useScreenFocusRefetch([
    QueryKeys.content.detail(id ?? '', profileId),
    QueryKeys.content.entitlement(id ?? '', profileId),
    QueryKeys.favorites.status(id ?? '', profileId),
    QueryKeys.watch.history(profileId),
  ]);

  // ── Modals locaux (état UI pur) ────────────────────────────────────────────
  const [showReport, setShowReport] = useState(false);
  const [showTvod, setShowTvod] = useState(false);

  // ── Données via hook encapsulé ─────────────────────────────────────────────
  const {
    content,
    isFavorite,
    seasons,
    resume,
    posterUrl,
    isSerie,
    canPlay,
    isAvod,
    isTvod,
    ppvPrice,
    isGeoBlocked,
    needsSubscription,
    entitlement,
    promoVideos,
    comingSoon,
    hasResume,
    canDownload,
    seriesPlayLabel,
    seriesPlayTarget,
    watchHistoryItems,
    videoQuality,
    isLoading,
  } = useContentDetail(id);

  const { liked, toggle: toggleLike, isPending: isLikePending } = useLike(
    id,
    (msg) => toast.error(msg),
  );

  // ── Actions encapsulées ────────────────────────────────────────────────────
  const { toggle: toggleFavorite, isPending: isFavPending } = useFavorite(
    id,
    isFavorite,
    (msg) => toast.error(msg),
  );

  const downloadEpisodeId = isSerie ? seriesPlayTarget?.episodeId : undefined;
  const downloadTitle =
    isSerie && seriesPlayTarget
      ? `${content?.title ?? 'Contenu'} · S.${seriesPlayTarget.seasonNumber} Ép.${seriesPlayTarget.episodeNumber}`
      : (content?.title ?? 'Contenu');

  const { download, progress: downloadProgress, isPending: isDownloading } = useDownload(
    id,
    {
      title: downloadTitle,
      thumbnailUrl: content?.posterUrl ?? content?.thumbnailUrl ?? undefined,
      episodeId: downloadEpisodeId,
    },
    (item) =>
      toast.success(
        item.localManifestUri || item.localVideoUri
          ? 'Téléchargement terminé — lecture hors ligne disponible.'
          : 'Licence enregistrée.',
      ),
    (msg) => toast.error(msg),
  );

  const { data: offlineItem } = useQuery({
    queryKey: QueryKeys.downloads.offlineStatus(id ?? '', downloadEpisodeId),
    queryFn: () => getOfflineByContentId(id!, downloadEpisodeId),
    enabled: !!id && isAuth && canDownload,
  });

  const isOfflineReady =
    !!offlineItem && !!(offlineItem.localManifestUri || offlineItem.localVideoUri);

  useScreenFocusRefetch([
    QueryKeys.downloads.offlineStatus(id ?? '', downloadEpisodeId),
  ]);

  // ── Navigation vers la lecture ─────────────────────────────────────────────
  function handlePlay(resumeEntry?: WatchHistoryEntry | null) {
    if (!isAuth) {
      router.push('/(auth)/login');
      return;
    }
    if (isGeoBlocked) {
      toast.error("Ce contenu n’est pas accessible dans votre région.");
      return;
    }
    if (isTvod && ppvPrice) {
      setShowTvod(true);
      return;
    }
    if (needsSubscription || (!canPlay && !isAvod)) {
      router.push('/settings/subscription');
      return;
    }
    const target = resumeEntry ?? (isSerie && seriesPlayTarget ? {
      episodeId: seriesPlayTarget.episodeId,
      contentId: id!,
      id: '',
    } as WatchHistoryEntry : null);
    router.push(buildWatchHref(id!, target ?? undefined) as never);
  }

  async function handleShare() {
    if (!content || !id) return;
    const { title, message, url } = buildSharePayload({
      contentId: id,
      title: content.title,
      resume: hasResume && resume && canResumeSession(resume) ? resume : null,
    });
    try {
      await Share.share({ title, message, url });
    } catch {
      /* annulation utilisateur */
    }
  }

  const playBlocked = isGeoBlocked;
  const playLabel =
    isTvod && ppvPrice
      ? `Acheter · ${formatXOF(ppvPrice)}`
      : needsSubscription
        ? 'S’abonner'
        : undefined;

  // ── État de chargement ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageCanvas>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} size="large" />
        </View>
      </PageCanvas>
    );
  }

  if (!content) return null;

  const genreCode = content.contentGenres?.[0]?.genre?.code;
  const genreLabel = content.contentGenres?.[0]?.genre?.label;
  const typeCode = content.contentType?.code ?? content.contentTypeCode;
  const typeLabel =
    (typeof content.contentType === 'object' && content.contentType?.label
      ? content.contentType.label
      : undefined) ?? getTypeLabel(typeCode, labelMap) ?? typeCode;

  const seasonCount = isSerie ? seasons.length : undefined;
  const episodeCount = isSerie
    ? seasons.reduce((sum, s) => sum + ((s as any).episodes?.length ?? 0), 0)
    : undefined;
  const countryLabel = (content as any)?.countryOfOrigin?.label as string | undefined;
  const languageLabel = (content as any)?.originalLanguage?.label as string | undefined;
  const resumeImageUrl = hasResume
    ? isSerie && resume?.episodeId
      ? resolveEpisodeThumbnailUrl(seasons as Season[], resume.episodeId, posterUrl) ??
        posterUrl ??
        undefined
      : contentResumeHeroUrl(content) ?? undefined
    : undefined;

  const resumeEpisodeMeta = resume?.episodeId
    ? seasons
        .flatMap((s) =>
          (s.episodes ?? []).map((ep) => ({
            ep,
            seasonNumber: s.seasonNumber,
          })),
        )
        .find(({ ep }) => ep.id === resume.episodeId)
    : null;

  const resumeSubtitle = hasResume
    ? formatResumeLabel({
        seasonNumber: resumeEpisodeMeta?.seasonNumber ?? resume?.episode?.seasonNumber,
        episodeNumber:
          resumeEpisodeMeta?.ep?.episodeNumber ?? resume?.episode?.episodeNumber,
        percentage: resume?.percentage,
        durationSec:
          resumeEpisodeMeta?.ep?.duration ?? content?.duration,
        watchedSeconds: resume?.watchedSeconds,
        includeDataEstimate: true,
      })
    : null;

  const entitlementAccess = isGeoBlocked
    ? ('geo_blocked' as const)
    : canPlay || isAvod
      ? ('available' as const)
      : needsSubscription
        ? ('subscription_required' as const)
        : isTvod
          ? ('purchase_required' as const)
          : null;

  return (
    <PageCanvas>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ContentHero
          posterUrl={posterUrl ?? undefined}
          resumeImageUrl={resumeImageUrl}
          resumePreview={resume?.resumePreview}
          resumeSubtitle={resumeSubtitle}
          title={content.title}
          typeLabel={typeLabel}
          genreLabel={genreLabel}
          year={(content as { releaseYear?: number }).releaseYear}
          durationSec={content.duration}
          creatorName={content.creator?.stageName}
          onCreatorPress={
            content.creator?.id
              ? () => router.push(`/creator/${content.creator!.id}`)
              : undefined
          }
          visibility={content.visibility as string}
          monetization={content.monetization as string}
          ppvPrice={ppvPrice}
          isAuthenticated={isAuth}
          isSerie={isSerie}
          hasResume={hasResume}
          resumePercent={
            resume?.percentage ??
            (content.duration && resume?.watchedSeconds
              ? (resume.watchedSeconds / content.duration) * 100
              : undefined)
          }
          onPlay={playBlocked ? () => {} : () => handlePlay()}
          onContinue={
            playBlocked || (isTvod && ppvPrice)
              ? undefined
              : hasResume && resume
                ? () => handlePlay(resume)
                : undefined
          }
          playLabel={playLabel ?? (isSerie ? seriesPlayLabel : undefined)}
          playDisabled={playBlocked}
          promoVideos={promoVideos}
          comingSoon={comingSoon}
          seasonCount={seasonCount}
          episodeCount={episodeCount}
          countryLabel={countryLabel}
          languageLabel={languageLabel}
          creatorVerified={(content as any)?.creator?.verified}
          entitlementAccess={isAuth ? entitlementAccess : null}
          onGenrePress={genreCode ? () => router.push(`/(tabs)/catalogue?genre=${genreCode}` as never) : undefined}
          actions={
            <>
              {isAuth ? (
                <ActionButton
                  icon={
                    <Heart
                      color={isFavorite ? colors.magenta : colors.muted}
                      fill={isFavorite ? colors.magenta : 'transparent'}
                      size={22}
                    />
                  }
                  label="Favori"
                  onPress={toggleFavorite}
                  disabled={isFavPending}
                />
              ) : null}
              {isAuth ? (
                <ActionButton
                  icon={
                    <ThumbsUp
                      color={liked ? colors.gold : colors.muted}
                      fill={liked ? colors.gold : 'transparent'}
                      size={22}
                    />
                  }
                  label="J'aime"
                  onPress={toggleLike}
                  disabled={isLikePending}
                />
              ) : null}
              {isAuth && canDownload ? (
                <ActionButton
                  icon={
                    isDownloading ? (
                      <ActivityIndicator color={colors.magenta} size="small" />
                    ) : isOfflineReady ? (
                      <Check color={colors.gold} size={22} />
                    ) : (
                      <Download color={colors.muted} size={22} />
                    )
                  }
                  label={
                    isDownloading
                      ? downloadProgress != null
                        ? `${downloadProgress} %`
                        : 'Téléchargement…'
                      : isOfflineReady
                        ? 'Téléchargé'
                        : 'Télécharger'
                  }
                  onPress={download}
                  disabled={isDownloading || isOfflineReady}
                />
              ) : null}
              {isAuth ? (
                <ActionButton
                  icon={<Flag color={colors.muted} size={22} />}
                  label="Signaler"
                  onPress={() => setShowReport(true)}
                />
              ) : null}
              <ActionButton
                icon={<Share2 color={colors.muted} size={22} />}
                label="Partager"
                onPress={handleShare}
              />
            </>
          }
        />

        <View style={styles.body}>
          {isSerie && seasons.length > 0 ? (
            <SeasonEpisodeList
              contentId={id!}
              seasons={seasons as Season[]}
              canWatch={canPlay || isAvod}
              canDownload={canDownload}
              resumeEpisodeId={resume?.episodeId}
              fallbackPosterUrl={posterUrl}
              watchHistory={
                resume?.episodeId
                  ? [
                      {
                        episodeId: resume.episodeId ?? undefined,
                        watchedSeconds: resume.watchedSeconds,
                        percentage: resume.percentage,
                        completed: resume.completed,
                      },
                    ]
                  : watchHistoryItems
                      .filter((h) => h.contentId === id && h.episodeId)
                      .map((h) => ({
                        episodeId: h.episodeId ?? undefined,
                        watchedSeconds: h.watchedSeconds,
                        percentage: h.percentage,
                        completed: h.completed,
                      }))
              }
            />
          ) : null}

          <PromoExtrasSection contentTitle={content.title} promoVideos={promoVideos} />

          {content.description &&
          content.description !== (content as { shortDescription?: string }).shortDescription ? (
            <ExpandableDescription text={content.description} />
          ) : content.description ? (
            <ExpandableDescription text={content.description} />
          ) : null}

          <ContentBadges
            isExclusive={(content as { isExclusive?: boolean }).isExclusive}
            visibility={content.visibility as string}
            ppvPrice={ppvPrice}
            maturityCode={
              (content as { maturityRating?: { code?: string } }).maturityRating?.code
            }
            quality={videoQuality}
            isAuthenticated={isAuth}
          />

          {/* Sections métadonnées */}
          <CrewSection contentId={id!} />
          <AwardsSection contentId={id!} />
          <SimilarContentRow
            contentId={id!}
            genreCode={genreCode}
            contentTypeCode={typeCode}
          />
          <ReviewsSection contentId={id!} />
          <CommentsSection contentId={id!} />
        </View>

        {/* ── Modals ──────────────────────────────────────────────────────── */}
        {showTvod && ppvPrice ? (
          <TvodPurchaseModal
            contentId={id!}
            contentTitle={content.title}
            ppvPrice={ppvPrice}
            onClose={() => setShowTvod(false)}
          />
        ) : null}

        <ReportModal
          contentId={id!}
          visible={showReport}
          onClose={() => setShowReport(false)}
        />

      </ScrollView>
    </PageCanvas>
  );
}

// ─── Composant ActionButton (local, réutilisable dans cet écran) ────────────

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Bouton d'action avec icône centrée et label en dessous. */
const ActionButton = memo(function ActionButton({
  icon,
  label,
  onPress,
  disabled = false,
}: ActionButtonProps) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} disabled={disabled}>
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  body: {
    paddingHorizontal: layout.pagePaddingX,
    gap: 14,
    paddingBottom: 48,
    paddingTop: 8,
  },
  actionBtn: { alignItems: 'center', gap: 4, minWidth: 56 },
  actionLabel: { fontSize: 11, color: colors.muted },
  description: { fontSize: 14, color: colors.muted, lineHeight: 21 },
});
