import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import type { CatalogSectionConfig } from "@/core/catalog/sections";
import type { ContentItem } from "@/components/content/ContentCard";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { CatalogHeroTrailerBackground } from "@/components/catalog/CatalogHeroTrailerBackground";
import {
  CatalogHeroFeatured,
  type FeaturedResume,
} from "@/components/catalog/CatalogHeroFeatured";
import { promoApi } from "@/infrastructure/api";
import { pickCatalogHeroPromo } from "@/core/promo/hero-trailer";
import { contentPosterUrl, contentBackdropUrl } from "@/utils/assets";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const SW = Dimensions.get("window").width;
const SH = Dimensions.get("window").height;
const VIDEO_BAND_H = SW * (9 / 16);
const SHOWCASE_H = Math.min(Math.max(SH * 0.68, 420), SH * 0.82);
const COMPACT_H = Math.min(SH * 0.42, 320);

interface Props {
  section: CatalogSectionConfig;
  total?: number;
  isLoading?: boolean;
  featured?: ContentItem | null;
  featuredProgress?: number | null;
  featuredResume?: FeaturedResume | null;
}

function HeroVignette() {
  return (
    <>
      <LinearGradient
        colors={["rgba(0,5,13,0.72)", "rgba(0,5,13,0.22)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,5,13,0.25)", "rgba(0,5,13,0.92)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["transparent", "rgba(123,0,153,0.04)", "rgba(255,165,0,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
      />
    </>
  );
}

function SectionHead({
  section,
  total,
  isLoading,
}: {
  section: CatalogSectionConfig;
  total?: number;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.sectionOnly}>
      <GradientText style={typography.kicker}>{section.kicker}</GradientText>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <AccentLine width={56} style={styles.sectionLine} />
      {section.description ? (
        <Text style={typography.bodyMuted}>{section.description}</Text>
      ) : null}
      <Text style={styles.sectionCount}>
        {isLoading
          ? "Chargement du catalogue…"
          : `${total ?? 0} titre${(total ?? 0) > 1 ? "s" : ""} disponible${(total ?? 0) > 1 ? "s" : ""}`}
      </Text>
    </View>
  );
}

/** Hero pages catalogue dédiées — parité CatalogPageHero web */
export function CatalogHero({
  section,
  total = 0,
  isLoading,
  featured,
  featuredProgress,
  featuredResume,
}: Props) {
  const hasFeatured = Boolean(featured && !isLoading);
  const poster = featured ? contentPosterUrl(featured) : null;
  const banner = featured ? contentBackdropUrl(featured) ?? poster : null;

  const { data: promoBundle } = useQuery({
    queryKey: ["catalog-hero-promo", featured?.id],
    queryFn: () => promoApi.getBundle(featured!.id),
    enabled: Boolean(hasFeatured && featured?.id),
    staleTime: 5 * 60_000,
  });

  const heroTrailer = pickCatalogHeroPromo(promoBundle, {
    comingSoon: (promoBundle as { preferTeaser?: boolean } | undefined)?.preferTeaser ?? false,
  });
  const hasTrailer = Boolean(heroTrailer);
  const staticBackdrop = hasTrailer ? poster : banner ?? poster;

  const heroHeight = !hasFeatured
    ? COMPACT_H
    : hasTrailer
      ? Math.max(VIDEO_BAND_H + 280, SHOWCASE_H * 0.78)
      : SHOWCASE_H;

  return (
    <View style={[styles.wrap, { minHeight: heroHeight }]}>
      <View style={[styles.backdrop, { height: heroHeight }]}>
        {hasFeatured && hasTrailer && heroTrailer ? (
          <View style={[styles.videoFrame, { height: VIDEO_BAND_H }]}>
            <CatalogHeroTrailerBackground promoId={heroTrailer.id} posterUri={poster} />
          </View>
        ) : staticBackdrop ? (
          <Image
            source={{ uri: staticBackdrop }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackBg} />
        )}

        <HeroVignette />
        {hasTrailer ? (
          <LinearGradient
            colors={["rgba(0,5,13,0.92)", "rgba(0,5,13,0.55)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFillObject, { opacity: 0.95 }]}
          />
        ) : null}
      </View>

      <View style={styles.overlay}>
        {hasFeatured && featured ? (
          <CatalogHeroFeatured
            content={featured}
            section={section}
            total={total}
            progress={featuredProgress}
            resumeSession={featuredResume}
            showSidePoster={!hasTrailer}
          />
        ) : (
          <SectionHead section={section} total={total} isLoading={isLoading} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
    position: "relative",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#030508",
  },
  videoFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "#030508",
  },
  fallbackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  overlay: {
    position: "absolute",
    left: layout.pagePaddingX,
    right: layout.pagePaddingX,
    bottom: 20,
    zIndex: 2,
  },
  sectionOnly: {
    gap: 6,
    alignItems: "flex-start",
    paddingBottom: 8,
  },
  sectionTitle: {
    ...typography.h1,
    fontSize: 28,
  },
  sectionLine: {
    marginTop: 4,
    marginBottom: 4,
  },
  sectionCount: {
    ...typography.bodyMuted,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
  },
});
