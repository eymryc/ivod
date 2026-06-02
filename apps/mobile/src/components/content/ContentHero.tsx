import type { ReactNode } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play } from "lucide-react-native";
import { BackButton } from "@/components/layout/BackButton";
import { AccentLine } from "@/components/layout/AccentLine";
import { MetaChip } from "@/components/layout/MetaChip";
import { MonetizationBadge } from "@/components/content/MonetizationBadge";
import { PromoVideoBar } from "@/components/content/PromoVideoBar";
import type { PromoVideosBundle } from "@/core/entities/promo.entity";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export interface ContentHeroProps {
  posterUrl?: string;
  title: string;
  typeLabel?: string;
  genreLabel?: string;
  year?: number | null;
  durationMin?: number | null;
  creatorName?: string;
  onCreatorPress?: () => void;
  visibility?: string;
  monetization?: string;
  isSerie?: boolean;
  hasResume?: boolean;
  resumePercent?: number;
  onPlay: () => void;
  onContinue?: () => void;
  /** Libellé personnalisé du bouton lecture (ex. achat TVOD). */
  playLabel?: string;
  playDisabled?: boolean;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
  actions?: ReactNode;
}

function formatDuration(min?: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

/** Hero fiche contenu + barre d'actions — aligné ContentHero web */
export function ContentHero({
  posterUrl,
  title,
  typeLabel,
  genreLabel,
  year,
  durationMin,
  creatorName,
  onCreatorPress,
  visibility,
  monetization,
  isSerie,
  hasResume,
  resumePercent,
  onPlay,
  onContinue,
  playLabel,
  playDisabled,
  promoVideos,
  comingSoon,
  actions,
}: ContentHeroProps) {
  const duration = formatDuration(durationMin);

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <BackButton floating safeTop />
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.bannerPh} />
        )}
        <LinearGradient
          colors={["rgba(0,5,13,0.4)", "transparent", "rgba(0,5,13,0.95)"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {hasResume && resumePercent != null && resumePercent > 0 ? (
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...gradients.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(100, resumePercent)}%` }]}
            />
          </View>
        ) : null}
        <View style={styles.bannerTitle}>
          <AccentLine width={40} />
          <Text style={styles.bannerTitleText} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>

      <View style={styles.bar}>
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.barAccent}
        />
        <View style={styles.barInner}>
          <View style={styles.playCol}>
            {hasResume && onContinue ? (
              <TouchableOpacity onPress={onContinue} activeOpacity={0.9}>
                <LinearGradient
                  colors={[...gradients.primaryBtn]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playPrimary}
                >
                  <Play color="#fff" size={18} fill="#fff" />
                  <Text style={styles.playPrimaryText}>
                    Reprendre {resumePercent != null ? `· ${Math.round(resumePercent)} %` : ""}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={onPlay}
              activeOpacity={0.9}
              disabled={playDisabled}
              style={playDisabled ? styles.playDisabled : undefined}
            >
              {isSerie ? (
                <View style={styles.playSeries}>
                  <Play color="#0f1419" size={18} fill="#0f1419" />
                  <Text style={styles.playSeriesText}>{playLabel ?? "Lecture"}</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={[...gradients.primaryBtn]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playPrimary}
                >
                  <Play color="#fff" size={18} fill="#fff" />
                  <Text style={styles.playPrimaryText}>{playLabel ?? "Lecture"}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
            <PromoVideoBar
              contentTitle={title}
              promoVideos={promoVideos}
              comingSoon={comingSoon}
            />
          </View>

          <View style={styles.metaCol}>
            <View style={styles.chips}>
              {typeLabel ? <MetaChip label={typeLabel} variant="exclusive" /> : null}
              {genreLabel ? <MetaChip label={genreLabel} variant="genre" /> : null}
              {year ? <MetaChip label={String(year)} /> : null}
              {duration ? <MetaChip label={duration} /> : null}
            </View>
            {visibility || monetization ? (
              <MonetizationBadge visibility={visibility} monetization={monetization} />
            ) : null}
            {creatorName ? (
              <TouchableOpacity onPress={onCreatorPress} disabled={!onCreatorPress}>
                <Text style={styles.creator}>{creatorName}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {actions ? <View style={styles.actionsRow}>{actions}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 8 },
  banner: {
    height: layout.heroDetailBanner,
    backgroundColor: colors.surface,
  },
  bannerPh: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backgroundElevated },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressFill: { height: "100%" },
  bannerTitle: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    gap: 8,
  },
  bannerTitleText: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 26,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 4,
  },
  bar: {
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  barAccent: { height: 2, width: "100%" },
  barInner: { padding: 16, gap: 14 },
  playCol: { gap: 10 },
  playPrimary: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  playPrimaryText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  playSeries: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  playSeriesText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f1419",
  },
  playDisabled: { opacity: 0.45 },
  metaCol: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  creator: {
    ...typography.body,
    color: colors.magenta,
    fontWeight: "600",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
