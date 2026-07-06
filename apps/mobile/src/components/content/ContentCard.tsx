import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Star, WifiOff } from "lucide-react-native";
import { ResumeThumbnail } from "@/components/content/ResumeThumbnail";
import type { ResumePreview } from "@/core/entities";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { shadows } from "@/theme/shadows";
import { MonetizationBadge } from "./MonetizationBadge";
import { useAuthStore } from "@/store/auth.store";
import { useContentTypes } from "@/hooks/use-content-types";
import { getContentTypeBadge } from "@/core/catalog/type-badges";
import { contentPosterUrl } from "@/utils/assets";

export interface ContentItem {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  posterObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  videoPosterObjectKey?: string | null;
  mediaAssets?: Array<{ type?: { code: string } | string; objectKey: string; isPrimary?: boolean }>;
  contentType?: string | { code?: string; label?: string };
  contentTypeCode?: string;
  contentGenres?: Array<{ genre?: { id?: string; code?: string; label?: string } }>;
  genres?: Array<{ id?: string; code?: string; label?: string }>;
  visibility?: string;
  monetization?: string;
  ppvPrice?: number | null;
  priceFcfa?: number | null;
  creator?: { stageName?: string };
  duration?: number | null;
  averageRating?: number;
  releaseYear?: number | null;
  progress?: number | null;
  playTarget?: {
    episodeId: string;
    seasonNumber: number;
    episodeNumber: number;
  } | null;
  resumePreview?: ResumePreview | null;
  watchedSeconds?: number;
  offlineAvailable?: boolean;
  /** Navigation directe vers le lecteur (rails reprise). */
  watchHref?: string;
}

interface ContentCardProps {
  item: ContentItem;
  width?: number;
  aspectRatio?: number;
  progress?: number | null;
  showProgress?: boolean;
  useResumeThumbnail?: boolean;
}

function resolveTypeCode(item: ContentItem): string | undefined {
  if (typeof item.contentType === "string") return item.contentType;
  return item.contentType?.code ?? item.contentTypeCode;
}

export function ContentCard({
  item,
  width = 140,
  aspectRatio = 2 / 3,
  progress,
  showProgress = true,
  useResumeThumbnail = false,
}: ContentCardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { labelMap } = useContentTypes();
  const ppvPrice = item.ppvPrice ?? item.priceFcfa;
  const image = contentPosterUrl(item) ?? item.posterUrl ?? item.thumbnailUrl;
  const typeCode = resolveTypeCode(item);
  const typeFromItem =
    typeof item.contentType === "object" && item.contentType?.label
      ? { label: item.contentType.label, bg: "rgba(123,0,153,0.35)", color: colors.magenta }
      : null;
  const typeCfg = typeFromItem ?? getContentTypeBadge(typeCode, labelMap);
  const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;
  const showStoryboard = useResumeThumbnail && item.resumePreview;
  const targetHref = item.watchHref ?? `/content/${item.id}`;

  return (
    <TouchableOpacity
      style={{ width }}
      onPress={() => router.push(targetHref as never)}
      activeOpacity={0.88}
    >
      <View style={[styles.poster, shadows.poster, { aspectRatio }]}>
        {showStoryboard && item.resumePreview ? (
          <ResumeThumbnail
            preview={item.resumePreview}
            width={width}
            height={width / aspectRatio}
            style={StyleSheet.absoluteFillObject}
          />
        ) : image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.placeholder]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={styles.bottomGrad}
        />
        <View style={styles.topBadges}>
          {typeCfg ? (
            <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg }]}>
              <Text style={[styles.typeText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
            </View>
          ) : null}
          <MonetizationBadge
            visibility={item.visibility}
            monetization={item.monetization}
            ppvPrice={ppvPrice}
            isAuthenticated={isAuthenticated}
          />
        </View>
        {item.offlineAvailable ? (
          <View style={styles.offlineBadge}>
            <WifiOff color="#fff" size={10} />
            <Text style={styles.offlineText}>Hors ligne</Text>
          </View>
        ) : null}
        {item.averageRating != null && item.averageRating > 0 ? (
          <View style={styles.rating}>
            <Star size={10} color={colors.gold} fill={colors.gold} />
            <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
          </View>
        ) : null}
        {showProgress && pct != null && pct > 0 && pct < 92 ? (
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[colors.purple, colors.magenta, colors.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      {item.creator?.stageName ? (
        <Text style={styles.creator} numberOfLines={1}>
          {item.creator.stageName}
        </Text>
      ) : item.releaseYear ? (
        <Text style={styles.creator}>{item.releaseYear}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  poster: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 0,
  },
  placeholder: { backgroundColor: colors.backgroundElevated },
  bottomGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  topBadges: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  typeText: { fontSize: 8, fontWeight: "700" },
  rating: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: "700",
    color: colors.gold,
  },
  offlineBadge: {
    position: "absolute",
    bottom: 8,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.magenta,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 0,
  },
  offlineText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressFill: { height: "100%" },
  title: {
    marginTop: 6,
    fontFamily: typography.h3.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    lineHeight: 17,
  },
  creator: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
