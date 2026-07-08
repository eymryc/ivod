import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Info, Heart } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import type { Banner } from "@/infrastructure/api/modules/banner.api";
import { bannerApi } from "@/infrastructure/api/modules/banner.api";
import { assetUrl } from "@/utils/assets";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { spacing } from "@/theme/spacing";
import {
  useResponsiveLayout,
  getHomeHeroHeight,
  type ResponsiveLayout,
} from "@/presentation/hooks/use-responsive-layout";

const SLIDE_MS = 7000;
const IMAGE_FADE_MS = 700;
const TEXT_FADE_MS = 400;
const EASE_PREMIUM = Easing.bezier(0.22, 1, 0.36, 1);

const DEFAULT_HERO_IMAGE = require("../../../assets/hero/hero.png");

/** Hauteur utile sous la top bar flottante (safe area + icône cloche). */
const TOP_BAR_CONTENT = 44;

function useHeroLayout() {
  const rl = useResponsiveLayout();
  const heroHeight = getHomeHeroHeight(rl.height, rl.isShort);
  const contentTop = rl.insets.top + 8 + TOP_BAR_CONTENT + (rl.isShort ? 4 : 8);
  const contentBottom = rl.isShort ? spacing.md : spacing.xl;
  const titleFontSize = rl.scaleFont(rl.isShort ? 22 : 26, 20, 30);
  const subtitleFontSize = rl.scaleFont(14, 13, 15);
  const copyGap = rl.isShort ? spacing.sm : spacing.md;
  const blockGap = rl.isShort ? spacing.md : spacing.lg;

  return {
    rl,
    heroHeight,
    contentTop,
    contentBottom,
    titleFontSize,
    subtitleFontSize,
    copyGap,
    blockGap,
    pagePaddingX: rl.pagePaddingX,
  };
}

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
        colors={["transparent", "rgba(0,5,13,0.12)", "rgba(0,5,13,0.6)"]}
        locations={[0.4, 0.72, 1]}
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

function contentPadStyle(
  pagePaddingX: number,
  contentTop: number,
  contentBottom: number,
): ViewStyle {
  return {
    position: "absolute",
    left: pagePaddingX,
    right: pagePaddingX,
    top: contentTop,
    bottom: contentBottom,
    justifyContent: "flex-end",
    zIndex: 2,
  };
}

function HeroSkeleton() {
  const { heroHeight, pagePaddingX, contentTop, contentBottom } = useHeroLayout();
  return (
    <View style={[styles.hero, styles.skeleton, { height: heroHeight }]}>
      <HeroVignette />
      <View style={contentPadStyle(pagePaddingX, contentTop, contentBottom)}>
        <View style={styles.skBadge} />
        <View style={styles.skLineLg} />
        <View style={styles.skLineMd} />
        <View style={styles.skCta} />
      </View>
    </View>
  );
}

type GhostIcon = "info" | "heart" | "none";

interface GhostCta {
  label: string;
  onPress: () => void;
  icon?: GhostIcon;
}

interface HeroContentProps {
  kicker: string;
  title: string;
  titleFontSize: number;
  subtitleFontSize: number;
  copyGap: number;
  blockGap: number;
  compact: boolean;
  subtitle?: string;
  badgeText?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  ghostCtas?: GhostCta[];
  carouselDots?: ReactNode;
}

function GhostCtaButton({
  label,
  onPress,
  icon = "none",
  compact,
}: GhostCta & { compact: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.btnGhost, compact && styles.btnGhostCompact]}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      {icon === "heart" ? (
        <Heart color={colors.magenta} size={15} fill={colors.magenta} />
      ) : icon === "info" ? (
        <Info color={colors.foreground} size={15} />
      ) : null}
      <Text style={styles.btnGhostText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function HeroContent({
  kicker,
  title,
  titleFontSize,
  subtitleFontSize,
  copyGap,
  blockGap,
  compact,
  subtitle,
  badgeText,
  primaryLabel,
  onPrimary,
  ghostCtas,
  carouselDots,
}: HeroContentProps) {
  const titleLineHeight = Math.round(titleFontSize * 1.2);
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.4);

  return (
    <View style={[styles.contentInner, { gap: blockGap }]}>
      <View style={[styles.copyBlock, { gap: copyGap }]}>
        {badgeText ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : (
          <GradientText style={styles.kicker}>{kicker}</GradientText>
        )}
        <Text
          style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}
          numberOfLines={compact ? 2 : 3}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { fontSize: subtitleFontSize, lineHeight: subtitleLineHeight },
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionsBlock}>
        <View style={styles.ctaRow}>
          <TouchableOpacity onPress={onPrimary} activeOpacity={0.9}>
            <LinearGradient
              colors={[...gradients.primaryBtn]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.btnPrimary, compact && styles.btnPrimaryCompact]}
            >
              <Play color="#fff" size={17} fill="#fff" />
              <Text style={styles.btnPrimaryText} numberOfLines={1}>
                {primaryLabel}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {ghostCtas?.map((cta) => (
            <GhostCtaButton key={cta.label} {...cta} compact={compact} />
          ))}
        </View>
        {carouselDots}
      </View>
    </View>
  );
}

function HeroCarouselDots({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.dot, i === activeIndex && styles.dotActive]}
          onPress={() => onSelect(i)}
          accessibilityLabel={`Bannière ${i + 1}`}
          accessibilityState={{ selected: i === activeIndex }}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        />
      ))}
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
  padStyle,
  children,
}: {
  activeIdx: number;
  padStyle: ViewStyle;
  children: ReactNode;
}) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    opacity.value = 0;
    translateY.value = 10;
    opacity.value = withTiming(1, { duration: TEXT_FADE_MS, easing: EASE_PREMIUM });
    translateY.value = withTiming(0, { duration: TEXT_FADE_MS, easing: EASE_PREMIUM });
  }, [activeIdx, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[padStyle, animStyle]}>{children}</Animated.View>;
}

function HomeHeroCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const layout = useHeroLayout();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const ghostCtas: GhostCta[] | undefined = banner.contentId
    ? [
        {
          label: "Plus d'infos",
          icon: "info",
          onPress: () => router.push(`/content/${banner.contentId}` as never),
        },
      ]
    : undefined;

  const pad = contentPadStyle(
    layout.pagePaddingX,
    layout.contentTop,
    layout.contentBottom,
  );

  return (
    <View
      style={[styles.hero, { height: layout.heroHeight }]}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <HeroBannerCrossfade banners={banners} activeIdx={idx} />
      <HeroVignette />

      <HeroAnimatedContent activeIdx={idx} padStyle={pad}>
        <HeroContent
          kicker="À la une"
          badgeText={banner.badgeText}
          title={banner.title}
          titleFontSize={layout.titleFontSize}
          subtitleFontSize={layout.subtitleFontSize}
          copyGap={layout.copyGap}
          blockGap={layout.blockGap}
          compact={layout.rl.isShort}
          subtitle={banner.subtitle ?? undefined}
          primaryLabel={banner.ctaLabel || (banner.contentId ? "Regarder" : "Découvrir")}
          onPrimary={handlePrimary}
          ghostCtas={ghostCtas}
          carouselDots={
            <HeroCarouselDots
              count={banners.length}
              activeIndex={idx}
              onSelect={setIdx}
            />
          }
        />
      </HeroAnimatedContent>
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
  const layout = useHeroLayout();
  const greeting = displayName?.trim()
    ? `Bon retour, ${displayName.trim()}`
    : "Bon retour sur iVOD";

  const ghostCtas: GhostCta[] = isAuthenticated
    ? [
        {
          label: "Ma liste",
          icon: "heart",
          onPress: () => router.push("/favorites" as never),
        },
        ...(planCode !== "PREMIUM"
          ? [
              {
                label: "Voir les tarifs",
                icon: "none" as const,
                onPress: () => router.push("/pricing" as never),
              },
            ]
          : []),
      ]
    : [
        {
          label: "Voir les tarifs",
          icon: "none",
          onPress: () => router.push("/pricing" as never),
        },
        {
          label: "S'inscrire",
          icon: "none",
          onPress: () => router.push("/auth/register" as never),
        },
      ];

  const pad = contentPadStyle(
    layout.pagePaddingX,
    layout.contentTop,
    layout.contentBottom,
  );

  return (
    <View style={[styles.hero, { height: layout.heroHeight }]}>
      <Image source={DEFAULT_HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
      <HeroVignette />
      <View style={pad}>
        <HeroContent
          kicker={isAuthenticated ? greeting : "Cinéma & séries africains"}
          title={isAuthenticated ? "Que voulez-vous regarder ?" : "Films & séries africains"}
          titleFontSize={layout.titleFontSize}
          subtitleFontSize={layout.subtitleFontSize}
          copyGap={layout.copyGap}
          blockGap={layout.blockGap}
          compact={layout.rl.isShort}
          subtitle={
            isAuthenticated
              ? "Retrouvez vos favoris, reprenez vos lectures et explorez le catalogue."
              : "Des milliers de contenus africains. Pass 24h dès 150 FCFA."
          }
          primaryLabel="Explorer les films"
          onPrimary={() => router.push("/(tabs)/catalog/films" as never)}
          ghostCtas={ghostCtas}
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
  contentInner: {
    maxWidth: 560,
  },
  copyBlock: {},
  actionsBlock: {
    gap: spacing.md,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 0,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(230,0,126,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#fff",
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    ...typography.bodyMuted,
    color: "rgba(255,255,255,0.78)",
    maxWidth: 400,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 2,
    minHeight: 44,
  },
  btnPrimaryCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,5,13,0.4)",
    borderRadius: 2,
    minHeight: 44,
  },
  btnGhostCompact: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.94)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  dotActive: {
    width: 18,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.magenta,
  },
  skBadge: {
    width: 72,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
    borderRadius: 2,
  },
  skLineLg: {
    width: "78%",
    height: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  skLineMd: {
    width: "55%",
    height: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 20,
  },
  skCta: {
    width: 168,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
  },
});
