import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { shadows } from "@/theme/shadows";
import { MonetizationBadge } from "./MonetizationBadge";
import { useContentTypes } from "@/hooks/use-content-types";
import { getContentTypeBadge } from "@/core/catalog/type-badges";
import { contentPosterUrl } from "@/utils/assets";

export interface ContentItem {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  posterObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  videoPosterObjectKey?: string | null;
  mediaAssets?: Array<{ type?: { code: string } | string; objectKey: string; isPrimary?: boolean }>;
  contentType?: string | { code?: string; label?: string };
  contentTypeCode?: string;
  visibility?: string;
  monetization?: string;
  creator?: { stageName?: string };
  duration?: number | null;
  averageRating?: number;
  releaseYear?: number | null;
  progress?: number | null;
}

interface ContentCardProps {
  item: ContentItem;
  width?: number;
  aspectRatio?: number;
  progress?: number | null;
  showProgress?: boolean;
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
}: ContentCardProps) {
  const router = useRouter();
  const { labelMap } = useContentTypes();
  const image = contentPosterUrl(item) ?? item.posterUrl ?? item.thumbnailUrl;
  const typeCode = resolveTypeCode(item);
  const typeFromItem =
    typeof item.contentType === "object" && item.contentType?.label
      ? { label: item.contentType.label, bg: "rgba(123,0,153,0.35)", color: colors.magenta }
      : null;
  const typeCfg = typeFromItem ?? getContentTypeBadge(typeCode, labelMap);
  const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <TouchableOpacity
      style={{ width }}
      onPress={() => router.push(`/content/${item.id}`)}
      activeOpacity={0.88}
    >
      <View style={[styles.poster, shadows.poster, { aspectRatio }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
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
          <MonetizationBadge visibility={item.visibility} monetization={item.monetization} />
        </View>
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
    borderColor: colors.border,
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
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
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
