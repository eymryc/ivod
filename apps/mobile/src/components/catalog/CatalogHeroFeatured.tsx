import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Info } from "lucide-react-native";
import type { ContentItem } from "@/components/content/ContentCard";
import type { CatalogSectionConfig } from "@/core/catalog/sections";
import { MetaChip } from "@/components/layout/MetaChip";
import { useAuthStore } from "@/store/auth.store";
import {
  buildWatchHref,
  canResumeSession,
  type WatchHistoryEntry,
} from "@/core/entities/watch.entity";
import { formatSeriesPlayLabel } from "@/presentation/utils/series-play";
import { formatDuration } from "@/core/utils/format-duration";
import {
  viewerOfferLabel,
  viewerOfferBadgeColor,
  viewerOfferBadgeTextColor,
  shouldShowOfferBadgeOnCard,
} from "@/core/constants/monetization";
import { contentPosterUrl } from "@/utils/assets";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

type PlayTarget = {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
};

export type FeaturedResume = WatchHistoryEntry & {
  episode?: { seasonNumber: number; episodeNumber: number } | null;
};

interface Props {
  content: ContentItem;
  section: CatalogSectionConfig;
  total: number;
  progress?: number | null;
  resumeSession?: FeaturedResume | null;
  /** Affiche une vignette poster au-dessus du texte (sans BA en fond). */
  showSidePoster?: boolean;
}

function resolveTypeCode(item: ContentItem): string | undefined {
  if (typeof item.contentType === "string") return item.contentType;
  return item.contentType?.code ?? item.contentTypeCode;
}

function resolveHeroSeriesTarget(
  content: ContentItem,
  resumeSession?: FeaturedResume | null,
): PlayTarget | null {
  if (
    resumeSession?.episodeId &&
    resumeSession.episode &&
    canResumeSession(resumeSession)
  ) {
    return {
      episodeId: resumeSession.episodeId,
      seasonNumber: resumeSession.episode.seasonNumber,
      episodeNumber: resumeSession.episode.episodeNumber,
    };
  }
  return content.playTarget ?? null;
}

export function CatalogHeroFeatured({
  content,
  section,
  total,
  progress,
  resumeSession,
  showSidePoster = true,
}: Props) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const poster = contentPosterUrl(content);
  const typeCode = resolveTypeCode(content);
  const isSerie = typeCode === "SERIE" || typeCode === "WEB_SERIE";
  const playTarget = isSerie ? resolveHeroSeriesTarget(content, resumeSession) : null;

  const pct = resumeSession?.percentage ?? progress ?? 0;
  const hasProgress = resumeSession
    ? canResumeSession(resumeSession)
    : pct > 2 && pct < 98;

  let playLabel = hasProgress ? "Reprendre" : "Lecture";
  if (isSerie && playTarget) {
    playLabel = formatSeriesPlayLabel(playTarget, hasProgress ? "resume" : "play");
  }

  const showPlayButton = !isSerie || Boolean(playTarget);
  const watchPath = buildWatchHref(
    content.id,
    isSerie && playTarget
      ? { id: "", contentId: content.id, episodeId: playTarget.episodeId }
      : null,
  );

  const handlePlay = () => {
    if (!isAuthenticated) {
      router.push(`/(auth)/login` as never);
      return;
    }
    router.push(watchPath as never);
  };

  const offerLabel = viewerOfferLabel(content.visibility, content.ppvPrice ?? content.priceFcfa);
  const showOfferBadge = shouldShowOfferBadgeOnCard(
    isAuthenticated,
    content.visibility,
    offerLabel,
  );

  const genres =
    content.genres ??
    content.contentGenres?.map((g) => g.genre).filter(Boolean) ??
    [];

  const meta = [
    content.releaseYear ? String(content.releaseYear) : null,
    content.duration ? formatDuration(content.duration) : null,
  ].filter(Boolean) as string[];

  const countLabel = `${total} titre${total > 1 ? "s" : ""}`;
  const heroDescription =
    content.description?.trim() || content.shortDescription?.trim() || null;

  return (
    <View style={styles.wrap}>
      {showSidePoster && poster ? (
        <View style={styles.posterWrap}>
          <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}

      <Text style={styles.sectionMeta}>
        {section.title}
        <Text style={styles.sectionMetaDot}> · </Text>
        <Text style={styles.sectionMetaCount}>{countLabel}</Text>
      </Text>

      <View style={styles.editorialRow}>
        <LinearGradient
          colors={[colors.gold, colors.magenta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.editorialLine}
        />
        <Text style={styles.editorial}>À la une</Text>
      </View>

      <Text style={styles.title} numberOfLines={3}>
        {content.title}
      </Text>

      {(showOfferBadge || genres.length > 0 || meta.length > 0) && (
        <View style={styles.chips}>
          {showOfferBadge && offerLabel ? (
            <View
              style={[
                styles.offerChip,
                { backgroundColor: viewerOfferBadgeColor(content.visibility) },
              ]}
            >
              <Text
                style={[
                  styles.offerChipText,
                  { color: viewerOfferBadgeTextColor(content.visibility) },
                ]}
              >
                {offerLabel}
              </Text>
            </View>
          ) : null}
          {genres.slice(0, 2).map((g) => (
            <MetaChip
              key={g.id ?? g.code ?? g.label}
              label={g.label ?? g.code ?? ""}
              variant="genre"
            />
          ))}
          {meta.map((item) => (
            <MetaChip key={item} label={item} />
          ))}
        </View>
      )}

      {heroDescription ? (
        <Text style={styles.description} numberOfLines={4}>
          {heroDescription}
        </Text>
      ) : null}

      {hasProgress ? (
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[...gradients.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        {showPlayButton ? (
          <TouchableOpacity onPress={handlePlay} activeOpacity={0.9}>
            {isSerie && playTarget ? (
              <View style={styles.playSeries}>
                <Play color="#0f1419" size={18} fill="#0f1419" />
                <Text style={styles.playSeriesText}>{playLabel}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playPrimary}
              >
                <Play color="#fff" size={18} fill="#fff" />
                <Text style={styles.playPrimaryText}>{playLabel}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => router.push(`/content/${content.id}` as never)}
          activeOpacity={0.9}
        >
          <Info color={colors.foreground} size={17} />
          <Text style={styles.infoBtnText}>Plus d'infos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
    paddingBottom: 4,
  },
  posterWrap: {
    width: 112,
    aspectRatio: 2 / 3,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.surface,
  },
  poster: { width: "100%", height: "100%" },
  sectionMeta: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  sectionMetaDot: { color: "rgba(255,255,255,0.25)" },
  sectionMetaCount: { color: "rgba(255,255,255,0.5)" },
  editorialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  editorialLine: { width: 32, height: 1 },
  editorial: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.gold,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 30,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 34,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  offerChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerChipText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "300",
    marginBottom: 12,
    maxWidth: layout.maxContentWidth,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 1,
    overflow: "hidden",
    marginBottom: 14,
    maxWidth: 280,
  },
  progressFill: { height: "100%" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  playPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  playPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  playSeries: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  playSeriesText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f1419",
  },
  infoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  infoBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
});
