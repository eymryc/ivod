import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import type { Banner } from "@/infrastructure/api/modules/banner.api";
import { bannerApi } from "@/infrastructure/api/modules/banner.api";
import { assetUrl } from "@/utils/assets";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const SW = Dimensions.get("window").width;
const SH = Dimensions.get("window").height;
const SLIDE_MS = 7000;
const IMAGE_FADE_MS = 700;
const TEXT_FADE_MS = 400;
const EASE_PREMIUM = Easing.bezier(0.22, 1, 0.36, 1);

/** Hero mobile — format portrait-friendly, hauteur premium sans écraser le contenu */
const HERO_H = Math.min(Math.max(SH * 0.5, SW * 1.05), Math.min(SH * 0.62, 540));

const DEFAULT_HERO_IMAGE = require("../../../assets/hero/hero.png");

export interface HomeHeroProps {
  banners?: Banner[];
  isLoading?: boolean;
  isAuthenticated?: boolean;
  displayName?: string | null;
  planCode?: string;
}

function resolveBannerImage(banner: Banner): string | null {
  const key = banner.imageObjectKeyMobile ?? banner.imageObjectKey;
  if (key) return assetUrl(key);
  if (banner.imageUrl?.startsWith("http")) return banner.imageUrl;
  return null;
}

function HeroVignette() {
  return (
    <>
      <LinearGradient
        colors={["rgba(0,5,13,0.82)", "rgba(0,5,13,0.35)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.72, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,5,13,0.12)", "rgba(0,5,13,0.55)"]}
        locations={[0.45, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(123,0,153,0.06)", "transparent", "rgba(255,123,0,0.05)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </>
  );
}

function HeroSkeleton() {
  return (
    <View style={[styles.hero, styles.skeleton]}>
      <HeroVignette />
      <View style={styles.content}>
        <View style={styles.skBadge} />
        <View style={styles.skLineLg} />
        <View style={styles.skLineMd} />
        <View style={styles.skCta} />
      </View>
      <View style={styles.skCarousel} />
    </View>
  );
}

interface HeroContentProps {
  kicker: string;
  title: string;
  subtitle?: string;
  badgeText?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryWhite?: boolean;
}

function HeroContent({
  kicker,
  title,
  subtitle,
  badgeText,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  secondaryWhite,
}: HeroContentProps) {
  return (
    <View style={styles.contentInner}>
      {badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : (
        <GradientText style={styles.kicker}>{kicker}</GradientText>
      )}
      <AccentLine width={40} style={styles.accent} />
      <Text style={styles.title} numberOfLines={3}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.ctaRow}>
        <TouchableOpacity onPress={onPrimary} activeOpacity={0.9}>
          <LinearGradient
            colors={[...gradients.primaryBtn]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPrimary}
          >
            <Play color="#fff" size={18} fill="#fff" />
            <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
        {secondaryLabel && onSecondary ? (
          <TouchableOpacity
            onPress={onSecondary}
            activeOpacity={0.9}
            style={[styles.btnGhost, secondaryWhite && styles.btnWhite]}
          >
            {secondaryWhite ? (
              <Play color="#0f1419" size={16} fill="#0f1419" />
            ) : (
              <Info color={colors.foreground} size={16} />
            )}
            <Text style={[styles.btnGhostText, secondaryWhite && styles.btnWhiteText]}>
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function HeroCrossfadeLayer({
  uri,
  visible,
}: {
  uri: string | null;
  visible: boolean;
}) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: IMAGE_FADE_MS,
      easing: EASE_PREMIUM,
    });
  }, [visible, opacity]);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!uri || failed) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <Image
        source={{ uri }}
        style={styles.heroImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </Animated.View>
  );
}

function HeroBannerCrossfade({
  banners,
  activeIdx,
}: {
  banners: Banner[];
  activeIdx: number;
}) {
  const uris = useMemo(() => banners.map(resolveBannerImage), [banners]);

  useEffect(() => {
    uris.forEach((uri) => {
      if (uri) void Image.prefetch(uri);
    });
  }, [uris]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={DEFAULT_HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
      {banners.map((banner, i) => (
        <HeroCrossfadeLayer key={banner.id} uri={uris[i]} visible={i === activeIdx} />
      ))}
    </View>
  );
}

function HeroAnimatedContent({
  activeIdx,
  children,
}: {
  activeIdx: number;
  children: ReactNode;
}) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    opacity.value = 0;
    translateX.value = 20;
    opacity.value = withTiming(1, { duration: TEXT_FADE_MS, easing: EASE_PREMIUM });
    translateX.value = withTiming(0, { duration: TEXT_FADE_MS, easing: EASE_PREMIUM });
  }, [activeIdx, opacity, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={[styles.content, animStyle]}>{children}</Animated.View>;
}

interface CarouselControlsProps {
  idx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
}

function CarouselControls({ idx, total, onPrev, onNext, onSelect }: CarouselControlsProps) {
  if (total <= 1) return null;

  return (
    <View style={styles.carouselPanel} pointerEvents="box-none">
      <Text style={styles.carouselLabel}>
        Bannière {idx + 1}/{total}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((idx + 1) / total) * 100}%` }]} />
      </View>
      <View style={styles.carouselRow}>
        <TouchableOpacity
          style={styles.carouselNav}
          onPress={onPrev}
          accessibilityLabel="Bannière précédente"
        >
          <ChevronLeft color={colors.foreground} size={16} />
        </TouchableOpacity>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, i === idx && styles.dotActive]}
              onPress={() => onSelect(i)}
              accessibilityLabel={`Bannière ${i + 1}`}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.carouselNav}
          onPress={onNext}
          accessibilityLabel="Bannière suivante"
        >
          <ChevronRight color={colors.foreground} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HomeHeroCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goPrev = useCallback(
    () => setIdx((i) => (i - 1 + banners.length) % banners.length),
    [banners.length],
  );
  const goNext = useCallback(
    () => setIdx((i) => (i + 1) % banners.length),
    [banners.length],
  );

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    timerRef.current = setInterval(goNext, SLIDE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, paused, goNext, idx]);

  const banner = banners[idx];

  useEffect(() => {
    if (!banner?.id) return;
    const t = setTimeout(() => bannerApi.trackImpression(banner.id), 1000);
    return () => clearTimeout(t);
  }, [banner?.id]);

  const trackClick = () => {
    if (banner?.id) void bannerApi.trackClick(banner.id);
  };

  const handlePrimary = () => {
    trackClick();
    if (banner.contentId) {
      router.push(`/watch/${banner.contentId}` as never);
      return;
    }
    if (banner.linkUrl) {
      router.push(banner.linkUrl as never);
      return;
    }
    router.push("/browse");
  };

  const handleSecondary = () => {
    if (banner.contentId) {
      router.push(`/content/${banner.contentId}` as never);
    }
  };

  const ctaStyle = banner.ctaStyle ?? "PRIMARY";
  const useWhiteSecondary = ctaStyle === "PREMIUM";

  return (
    <View
      style={styles.hero}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <HeroBannerCrossfade banners={banners} activeIdx={idx} />
      <HeroVignette />

      <HeroAnimatedContent activeIdx={idx}>
        <HeroContent
          kicker="À la une"
          badgeText={banner.badgeText}
          title={banner.title}
          subtitle={banner.subtitle ?? undefined}
          primaryLabel={banner.ctaLabel || (banner.contentId ? "Regarder" : "Découvrir")}
          onPrimary={handlePrimary}
          secondaryLabel={banner.contentId ? "Plus d'infos" : undefined}
          onSecondary={banner.contentId ? handleSecondary : undefined}
          secondaryWhite={useWhiteSecondary}
        />
      </HeroAnimatedContent>

      <CarouselControls
        idx={idx}
        total={banners.length}
        onPrev={goPrev}
        onNext={goNext}
        onSelect={setIdx}
      />
    </View>
  );
}

function HomeHeroDefault({
  isAuthenticated,
  displayName,
  planCode,
}: {
  isAuthenticated: boolean;
  displayName?: string | null;
  planCode?: string;
}) {
  const router = useRouter();
  const greeting = displayName?.trim()
    ? `Bon retour, ${displayName.trim()}`
    : "Bon retour sur iVOD";

  return (
    <View style={styles.hero}>
      <Image source={DEFAULT_HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
      <HeroVignette />
      <View style={styles.content}>
      <HeroContent
        kicker={isAuthenticated ? greeting : "Cinéma & séries africains"}
        title={isAuthenticated ? "Que voulez-vous regarder ?" : "Films & séries africains"}
        subtitle={
          isAuthenticated
            ? "Retrouvez vos favoris, reprenez vos lectures et explorez le catalogue."
            : "Des milliers de contenus africains en streaming. Pass 24h dès 150 FCFA ou Premium à 1 500 FCFA/mois — paiement Paystack."
        }
        primaryLabel="Explorer les films"
        onPrimary={() => router.push("/catalog/films" as never)}
        secondaryLabel={
          isAuthenticated
            ? planCode !== "PREMIUM"
              ? "Voir les tarifs"
              : "Ma liste"
            : "Voir les tarifs"
        }
        onSecondary={() =>
          router.push(
            (isAuthenticated && planCode === "PREMIUM" ? "/favorites" : "/pricing") as never,
          )
        }
      />
      </View>
    </View>
  );
}

/** Hero accueil — carousel bannières ou hero éditorial par défaut. */
export function HomeHero({
  banners = [],
  isLoading,
  isAuthenticated = false,
  displayName,
  planCode = "FREE",
}: HomeHeroProps) {
  if (isLoading) return <HeroSkeleton />;
  if (banners.length > 0) return <HomeHeroCarousel banners={banners} />;
  return (
    <HomeHeroDefault
      isAuthenticated={isAuthenticated}
      displayName={displayName}
      planCode={planCode}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: HERO_H,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  skeleton: {
    backgroundColor: colors.surface,
  },
  content: {
    position: "absolute",
    left: layout.pagePaddingX,
    right: layout.pagePaddingX + 88,
    top: 64,
    bottom: 78,
    justifyContent: "flex-end",
    zIndex: 2,
  },
  contentInner: {
    flex: 1,
    justifyContent: "flex-end",
  },
  kicker: { fontSize: 10, letterSpacing: 2.8, marginBottom: 4 },
  accent: { marginVertical: 6 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.magenta,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: Math.min(28, SW * 0.075),
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 34,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    ...typography.bodyMuted,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
    marginBottom: 14,
    maxWidth: 300,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 2,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,5,13,0.35)",
    borderRadius: 2,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
  btnWhite: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  btnWhiteText: {
    color: "#0f1419",
  },
  carouselPanel: {
    position: "absolute",
    right: layout.pagePaddingX,
    bottom: 58,
    width: 148,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: "rgba(0,5,13,0.62)",
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.28)",
    borderRadius: layout.radiusSm,
    zIndex: 4,
  },
  carouselLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    textAlign: "right",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.magenta,
  },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  carouselNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.magenta,
    borderColor: colors.magenta,
  },
  skBadge: {
    width: 72,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
    borderRadius: 2,
  },
  skLineLg: {
    width: "78%",
    height: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  skLineMd: {
    width: "55%",
    height: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  skCta: {
    width: 140,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
  },
  skCarousel: {
    position: "absolute",
    right: layout.pagePaddingX,
    bottom: 16,
    width: 148,
    height: 72,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: layout.radiusSm,
  },
});
