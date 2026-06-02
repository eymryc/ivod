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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Download, Share2, Flag, ThumbsUp } from 'lucide-react-native';
import { formatXOF } from '@/core/pricing/format';
import { TvodPurchaseModal } from '@/components/payment/TvodPurchaseModal';
import { useLike } from '@/presentation/hooks/use-like';
import { useContentDetail } from '@/presentation/hooks/use-content-detail';
import { useFavorite } from '@/presentation/hooks/use-favorite';
import { useDownload } from '@/presentation/hooks/use-download';
import { useAuthStore } from '@/store/auth.store';
import { useContentTypes } from '@/hooks/use-content-types';
import { getTypeLabel } from '@/core/catalog/content-types';
import { buildWatchHref } from '@/core/entities';

import { ContentHero } from '@/components/content/ContentHero';
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
import { typography } from '@/theme/typography';
import type { WatchHistoryEntry, Season } from '@/core/entities';

// ─── Écran principal ────────────────────────────────────────────────────────

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const { labelMap } = useContentTypes();

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
    promoVideos,
    comingSoon,
    hasResume,
    isLoading,
  } = useContentDetail(id);

  const { liked, toggle: toggleLike, isPending: isLikePending } = useLike(
    id,
    (msg) => Alert.alert('Erreur', msg),
  );

  // ── Actions encapsulées ────────────────────────────────────────────────────
  const { toggle: toggleFavorite, isPending: isFavPending } = useFavorite(
    id,
    isFavorite,
    (msg) => Alert.alert('Erreur', msg),
  );

  const { download, progress: downloadProgress, isPending: isDownloading } = useDownload(
    id,
    {
      title: content?.title ?? 'Contenu',
      thumbnailUrl: content?.posterUrl ?? content?.thumbnailUrl ?? undefined,
    },
    (item) => Alert.alert(
      'Téléchargement',
      item.localVideoUri ? 'Vidéo hors ligne prête.' : 'Métadonnées enregistrées.',
    ),
    (msg) => Alert.alert('Erreur', msg),
  );

  // ── Navigation vers la lecture ─────────────────────────────────────────────
  function handlePlay(resumeEntry?: WatchHistoryEntry | null) {
    if (!isAuth) {
      router.push('/(auth)/login');
      return;
    }
    if (isGeoBlocked) {
      Alert.alert('Indisponible', 'Ce contenu n’est pas accessible dans votre région.');
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
    router.push(buildWatchHref(id!, resumeEntry ?? undefined) as never);
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
  return (
    <PageCanvas>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ContentHero
          posterUrl={posterUrl ?? undefined}
          title={content.title}
          typeLabel={typeLabel}
          genreLabel={genreLabel}
          year={(content as { releaseYear?: number }).releaseYear}
          durationMin={content.duration}
          creatorName={content.creator?.stageName}
          onCreatorPress={
            content.creator?.id
              ? () => router.push(`/creator/${content.creator!.id}`)
              : undefined
          }
          visibility={content.visibility as string}
          monetization={content.monetization as string}
          isSerie={isSerie}
          hasResume={hasResume}
          resumePercent={resume?.percentage}
          onPlay={playBlocked ? () => {} : () => handlePlay()}
          onContinue={
            playBlocked || (isTvod && ppvPrice)
              ? undefined
              : hasResume && resume
                ? () => handlePlay(resume)
                : undefined
          }
          playLabel={playLabel}
          playDisabled={playBlocked}
          promoVideos={promoVideos}
          comingSoon={comingSoon}
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
              {isAuth ? (
                <ActionButton
                  icon={
                    isDownloading ? (
                      <ActivityIndicator color={colors.magenta} size="small" />
                    ) : (
                      <Download color={colors.muted} size={22} />
                    )
                  }
                  label={downloadProgress != null ? `${downloadProgress} %` : 'Télécharger'}
                  onPress={download}
                  disabled={isDownloading}
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
                onPress={() => {}}
              />
            </>
          }
        />

        <View style={styles.body}>
          <PromoExtrasSection contentTitle={content.title} promoVideos={promoVideos} />

          {isSerie && seasons.length > 0 ? (
            <SeasonEpisodeList
              contentId={id!}
              seasons={seasons as Season[]}
              canWatch={canPlay || isAvod}
            />
          ) : null}

          {content.description ? (
            <Text style={styles.description}>{content.description}</Text>
          ) : null}

          {/* Sections métadonnées */}
          <AwardsSection contentId={id!} />
          <CrewSection contentId={id!} />
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
