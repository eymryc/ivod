import type { ReactNode } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, Play } from "lucide-react-native";
import { BackButton } from "@/components/layout/BackButton";
import { AccentLine } from "@/components/layout/AccentLine";
import { MetaChip } from "@/components/layout/MetaChip";
import { MonetizationBadge } from "@/components/content/MonetizationBadge";
import { PromoVideoBar } from "@/components/content/PromoVideoBar";
import type { PromoVideosBundle } from "@/core/entities/promo.entity";
import type { ResumePreview } from "@/core/entities";
import { ResumeThumbnail } from "@/components/content/ResumeThumbnail";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export interface ContentHeroProps {
  posterUrl?: string;
  /** Vignette épisode en cours — remplace le poster dans le hero si reprise active. */
  resumeImageUrl?: string;
  /** Storyboard à la seconde exacte (prioritaire sur resumeImageUrl). */
  resumePreview?: ResumePreview | null;
  /** S2 É3 · 42 % · il reste 18 min */
  resumeSubtitle?: string | null;
  title: string;
  typeLabel?: string;
  genreLabel?: string;
  year?: number | null;
  /** Durée en secondes (aligné API / web) */
  durationSec?: number | null;
  creatorName?: string;
  onCreatorPress?: () => void;
  visibility?: string;
  monetization?: string;
  ppvPrice?: number | null;
  isAuthenticated?: boolean;
  isSerie?: boolean;
  hasResume?: boolean;
  resumePercent?: number;
  onPlay: () => void;
  onContinue?: () => void;
  /** Libellé personnalisé du bouton lecture (ex. achat TVOD, reprise série). */
  playLabel?: string;
  playDisabled?: boolean;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
  actions?: ReactNode;
  seasonCount?: number;
  episodeCount?: number;
  countryLabel?: string;
  languageLabel?: string;
  creatorVerified?: boolean;
  entitlementAccess?: 'available' | 'subscription_required' | 'purchase_required' | 'geo_blocked' | null;
  onGenrePress?: () => void;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(seconds % 60)} s`;
}

function buildPrimaryPlayLabel(
  hasResume: boolean | undefined,
  playLabel: string | undefined,
  resumePercent: number | undefined,
): string {
  const base = playLabel ?? (hasResume ? "Reprendre" : "Lecture");
  if (hasResume && resumePercent != null && resumePercent > 0) {
    return `${base} · ${Math.round(resumePercent)} %`;
  }
  return base;
}

/** Hero fiche contenu + barre d'actions — aligné ContentHero web */
export function ContentHero({
  posterUrl,
  resumeImageUrl,
  resumePreview,
  resumeSubtitle,
  title,
  typeLabel,
  genreLabel,
  year,
  durationSec,
  creatorName,
  onCreatorPress,
  visibility,
  monetization,
  ppvPrice,
  isAuthenticated = false,
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
  seasonCount,
  episodeCount,
  countryLabel,
  languageLabel,
  creatorVerified,
  entitlementAccess,
  onGenrePress,
}: ContentHeroProps) {
  const duration = !isSerie ? formatDuration(durationSec) : null;
  /** Série en reprise : vignette épisode + play centré (pas de storyboard). */
  const isEpisodeResumeHero = Boolean(isSerie && hasResume && !comingSoon);
  const resumeVisual = hasResume ? resumeImageUrl ?? posterUrl : null;
  const useStoryboardHero = Boolean(
    !isSerie && hasResume && resumePreview && !comingSoon,
  );
  const isResumeHero = Boolean(
    hasResume &&
      !comingSoon &&
      (isEpisodeResumeHero ? Boolean(resumeVisual) : Boolean(resumeVisual || useStoryboardHero)),
  );
  const heroImage = isResumeHero && !useStoryboardHero ? resumeVisual : posterUrl;
  const bannerHeight = layout.heroDetailBanner;

  const primaryLabel = buildPrimaryPlayLabel(hasResume, playLabel, resumePercent);
  const primaryAction = hasResume && onContinue ? onContinue : onPlay;
  const showSecondaryPlay = isSerie && hasResume && onContinue;

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { height: bannerHeight }]}>
        <BackButton floating safeTop />
        {useStoryboardHero && resumePreview ? (
          <ResumeThumbnail
            preview={resumePreview}
            width={layout.screenWidth}
            height={bannerHeight}
            style={StyleSheet.absoluteFillObject}
          />
        ) : heroImage ? (
          <>
            <Image
              source={{ uri: heroImage }}
              style={[StyleSheet.absoluteFillObject, styles.bannerAmbient]}
              resizeMode="cover"
              blurRadius={28}
            />
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={isResumeHero ? "cover" : "contain"}
            />
          </>
        ) : null}
        {isResumeHero && (heroImage || useStoryboardHero) && !playDisabled ? (
          <TouchableOpacity
            style={styles.resumePlayOverlay}
            onPress={primaryAction}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={
              resumePercent != null && resumePercent > 0
                ? `Reprendre la lecture à ${Math.round(resumePercent)} %`
                : 'Reprendre la lecture'
            }
          >
            <LinearGradient
              colors={[...gradients.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resumePlayRing}
            >
              <View style={styles.resumePlayOrb}>
                <Play color="#fff" size={30} fill="#fff" style={{ marginLeft: 3 }} />
              </View>
            </LinearGradient>
            {resumePercent != null && resumePercent > 0 ? (
              <Text style={styles.resumePlayHint}>
                Reprendre · {Math.round(resumePercent)} %
              </Text>
            ) : (
              <Text style={styles.resumePlayHint}>Reprendre</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {!heroImage ? (
          <LinearGradient
            colors={["#1a0a2e", "#0d1528", colors.backgroundElevated]}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <LinearGradient
          colors={["rgba(0,5,13,0.55)", "transparent", "rgba(0,5,13,0.92)"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["transparent", "rgba(123,0,153,0.12)", "rgba(0,5,13,0.95)"]}
          locations={[0, 0.5, 1]}
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
            <TouchableOpacity
              onPress={primaryAction}
              activeOpacity={0.9}
              disabled={playDisabled}
              style={playDisabled ? styles.playDisabled : undefined}
            >
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playPrimary}
              >
                <Play color="#fff" size={18} fill="#fff" />
                <Text style={styles.playPrimaryText}>{primaryLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {showSecondaryPlay ? (
              <TouchableOpacity onPress={onPlay} activeOpacity={0.9} disabled={playDisabled}>
                <View style={styles.playSecondary}>
                  <Play color={colors.foreground} size={16} />
                  <Text style={styles.playSecondaryText}>Revoir depuis le début</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {hasResume && resumeSubtitle ? (
              <Text style={styles.resumeSubtitle}>{resumeSubtitle}</Text>
            ) : null}

            <PromoVideoBar
              contentTitle={title}
              promoVideos={promoVideos}
              comingSoon={comingSoon}
            />
          </View>

          <View style={styles.metaCol}>
            <View style={styles.chips}>
              {typeLabel ? <MetaChip label={typeLabel} variant="exclusive" /> : null}
              {genreLabel ? (
                onGenrePress ? (
                  <TouchableOpacity onPress={onGenrePress} activeOpacity={0.75}>
                    <MetaChip label={genreLabel} variant="genre" />
                  </TouchableOpacity>
                ) : (
                  <MetaChip label={genreLabel} variant="genre" />
                )
              ) : null}
              {year ? <MetaChip label={String(year)} /> : null}
              {duration ? <MetaChip label={duration} /> : null}
              {seasonCount != null && seasonCount > 0 ? (
                <MetaChip label={`${seasonCount} saison${seasonCount > 1 ? 's' : ''}`} />
              ) : null}
              {episodeCount != null && episodeCount > 0 ? (
                <MetaChip label={`${episodeCount} ép.`} />
              ) : null}
              {countryLabel ? <MetaChip label={countryLabel} /> : null}
              {languageLabel ? <MetaChip label={languageLabel} /> : null}
              {entitlementAccess === 'available' ? (
                <MetaChip label="Disponible" variant="gold" />
              ) : entitlementAccess === 'subscription_required' ? (
                <MetaChip label="Abonnement" variant="exclusive" />
              ) : entitlementAccess === 'purchase_required' ? (
                <MetaChip label="Achat" variant="gold" />
              ) : entitlementAccess === 'geo_blocked' ? (
                <MetaChip label="Indisponible" />
              ) : null}
            </View>
            {visibility || monetization ? (
              <MonetizationBadge
                visibility={visibility}
                monetization={monetization}
                ppvPrice={ppvPrice}
                isAuthenticated={isAuthenticated}
              />
            ) : null}
            {creatorName ? (
              <TouchableOpacity onPress={onCreatorPress} disabled={!onCreatorPress} style={styles.creatorRow}>
                <Text style={styles.creator}>{creatorName}</Text>
                {creatorVerified ? (
                  <BadgeCheck size={14} color={colors.magenta} />
                ) : null}
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
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  bannerAmbient: { opacity: 0.45, transform: [{ scale: 1.08 }] },
  resumePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    gap: 10,
  },
  resumePlayRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  resumePlayOrb: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  resumePlayHint: {
    ...typography.caption,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.6,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
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
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
    alignSelf: "stretch",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  playPrimaryText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  playSecondary: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  playSecondaryText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  resumeSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  playDisabled: { opacity: 0.45 },
  metaCol: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  creator: {
    ...typography.body,
    color: colors.magenta,
    fontWeight: "600",
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
