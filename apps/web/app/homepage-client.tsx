"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  Heart,
  ChevronRight,
  ChevronLeft,
  Info,
  Sparkles,
  Film,
  Tv,
  Clapperboard,
  MonitorPlay,
} from "lucide-react";
import { CatalogRails } from "@/components/catalog/CatalogRails";
import { CreatorsSpotlightRail } from "@/components/design/CreatorsSpotlightRail";
import { TrustPaymentBar } from "@/components/design/TrustPaymentBar";
import { ScrollRow } from "@/components/home/ScrollRow";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useSwipe } from "@/lib/hooks/useSwipe";
import { watchApi } from "@/lib/api/watch";
import { get } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useProfileStore } from "@/lib/stores/profile.store";
import { useUIStore } from "@/lib/stores/ui.store";
import { assetUrl, posterUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { formatDuration } from "@/lib/utils/format";
import { HOME_HERO_CLASS, HOME_HERO_CONTENT_POS } from "@/lib/constants/hero-layout";
import { HOME_BLOCK } from "@/components/public/PublicShell";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import {
  HeroTextCascade,
  HeroCascadeItem,
  HeroTitleGlow,
  HeroKenBurnsLayer,
  HomeSectionReveal,
  CategoryPillLink,
  HomeContentAmbient,
} from "@/components/home/HomeMotion";
import {
  staggerContainer,
  heroSlideImage,
  heroSlideText,
  useReducedMotion,
} from "@/lib/motion/premium-motion";

const BTN_PRIMARY =
  "ivod-btn ivod-btn-primary inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold";
const BTN_GHOST =
  "ivod-btn inline-flex items-center justify-center gap-2 h-11 px-5 border border-white/[0.12] bg-white/[0.04] text-white/90 text-sm font-medium hover:border-brand-magenta/50 hover:bg-white/[0.08] transition-colors";
const BTN_WHITE =
  "ivod-btn inline-flex items-center justify-center gap-2 h-11 px-6 bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors";

const QUICK_LINKS = [
  { label: "Films", href: "/films", icon: Film },
  { label: "Séries", href: "/series", icon: Tv },
  { label: "Web-séries", href: "/web-series", icon: MonitorPlay },
] as const;

// ── Hero ─────────────────────────────────────────────────────────────────

const HERO_CLASS = HOME_HERO_CLASS;

function HeroVignette() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-[#00050d]/72 via-[#00050d]/22 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#00050d]/95 via-[#00050d]/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/4 via-transparent to-brand-gold/[0.04]" />
      <div className="pointer-events-none absolute top-0 right-0 w-1/2 h-1/2 bg-brand-magenta/4 blur-[90px] hidden md:block" />
    </>
  );
}

const HERO_IMAGE_CLASS =
  "object-cover object-top brightness-[1.12] contrast-[1.02] saturate-[1.06]";

function HeroSkeleton() {
  return (
    <div className={HERO_CLASS}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] to-transparent" />
      <HeroVignette />
      <div className={`${HOME_HERO_CONTENT_POS} ${HOME_BLOCK}`}>
        <div className="max-w-3xl">
        <div className="h-3 w-48 rounded bg-white/10 mb-4" />
        <div className="h-10 w-2/3 max-w-lg rounded bg-white/10 mb-3" />
        <div className="h-4 w-1/2 max-w-sm rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}

const SLIDE_MS = 7000;

const CTA_BTN_CLASS: Record<string, string> = {
  PRIMARY: BTN_PRIMARY,
  GHOST:   BTN_GHOST,
  PREMIUM: BTN_WHITE,
};

/** CTA hero — colonne pleine largeur mobile, ligne à partir de sm */
const HERO_CTA_ROW = "flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full max-w-xl";
const HERO_CTA_LINK = "home-btn-lift w-full sm:w-auto justify-center";

function HeroCarouselDots({
  count,
  activeIndex,
  onSelect,
  className = "",
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 ${className}`}
      role="tablist"
      aria-label="Slides bannière"
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          onClick={() => onSelect(i)}
          aria-label={`Bannière ${i + 1}`}
          aria-selected={i === activeIndex}
          className={`hero-carousel-controls__dot ${i === activeIndex ? "is-active" : ""}`}
        />
      ))}
    </div>
  );
}

function HeroCarousel({ banners }: { banners: any[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile      = useMediaQuery("(max-width: 639px)");

  const goPrev = useCallback(
    () => setIdx((i) => (i - 1 + banners.length) % banners.length),
    [banners.length],
  );
  const goNext = useCallback(
    () => setIdx((i) => (i + 1) % banners.length),
    [banners.length],
  );

  const swipe = useSwipe(goPrev, goNext, {
    enabled: banners.length > 1,
    threshold: 40,
  });

  useEffect(() => {
    if (banners.length <= 1 || paused || swiping || reducedMotion) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [banners.length, paused, swiping, reducedMotion]);

  // Track impression ~1s after slide settles (avoids counting rapid swipes)
  useEffect(() => {
    const banner = banners[idx];
    if (!banner?.id) return;
    const t = setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/banners/${banner.id}/impression`, { method: "POST" }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [idx, banners]);

  const banner  = banners[idx];
  const imgKey  = (isMobile && banner.imageObjectKeyMobile) ? banner.imageObjectKeyMobile : banner.imageObjectKey;
  const imgUrl  = assetUrl(imgKey);
  const ctaBtn  = CTA_BTN_CLASS[banner.ctaStyle ?? "PRIMARY"] ?? BTN_PRIMARY;

  const trackClick = () => {
    if (!banner?.id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/banners/${banner.id}/click`, { method: "POST" }).catch(() => {});
  };

  return (
    <div
      className={`${HERO_CLASS} touch-pan-y`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Bannières à la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        setSwiping(true);
        setPaused(true);
        swipe.onTouchStart(e);
      }}
      onTouchEnd={(e) => {
        swipe.onTouchEnd(e);
        setSwiping(false);
        setPaused(false);
      }}
      onTouchCancel={() => {
        setSwiping(false);
        setPaused(false);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="absolute inset-0"
          {...heroSlideImage(reducedMotion)}
        >
          <HeroKenBurnsLayer>
            {imgUrl && (
              <MediaImage
                src={imgUrl}
                alt={banner.title}
                fill
                className={HERO_IMAGE_CLASS}
                priority
                sizes="100vw"
              />
            )}
          </HeroKenBurnsLayer>
        </motion.div>
      </AnimatePresence>
      <HeroVignette />

      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${idx}`}
          className={`${HOME_HERO_CONTENT_POS} ${HOME_BLOCK} pointer-events-auto`}
          {...heroSlideText(reducedMotion)}
        >
          <HeroTextCascade replayKey={idx} className="max-w-3xl">
            <HeroCascadeItem>
              {banner.badgeText ? (
                <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 mb-2 sm:mb-3 bg-primary/90 text-white">
                  {banner.badgeText}
                </span>
              ) : (
                <p className="text-caption font-semibold text-brand-magenta mb-2 sm:mb-3">
                  À la une
                </p>
              )}
            </HeroCascadeItem>
            <HeroCascadeItem className="hidden sm:block">
              <div className="ivod-line-accent w-12 mb-3 sm:mb-4" />
            </HeroCascadeItem>
            <HeroCascadeItem>
              <HeroTitleGlow>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.12] mb-2 sm:mb-3 line-clamp-2">
                  {banner.title}
                </h1>
              </HeroTitleGlow>
            </HeroCascadeItem>
            {banner.subtitle && (
              <HeroCascadeItem>
                <p className="text-white/75 text-sm md:text-base font-light mb-3 sm:mb-5 line-clamp-1 sm:line-clamp-2 max-w-xl">
                  {banner.subtitle}
                </p>
              </HeroCascadeItem>
            )}
            <HeroCascadeItem>
              <div className={HERO_CTA_ROW}>
                {banner.contentId && (
                  <>
                    <Link
                      href={`/watch/${banner.contentId}`}
                      onClick={trackClick}
                      className={`${ctaBtn} ${HERO_CTA_LINK}`}
                    >
                      <Play size={18} className="fill-current shrink-0" />
                      {banner.ctaLabel || "Regarder"}
                    </Link>
                    <Link href={`/content/${banner.contentId}`} className={`${BTN_GHOST} ${HERO_CTA_LINK}`}>
                      <Info size={16} className="shrink-0" />
                      Plus d&apos;infos
                    </Link>
                  </>
                )}
                {!banner.contentId && banner.linkUrl && (
                  <Link href={banner.linkUrl} onClick={trackClick} className={`${ctaBtn} ${HERO_CTA_LINK}`}>
                    {banner.ctaLabel || "Découvrir"}
                  </Link>
                )}
              </div>
            </HeroCascadeItem>
            {banners.length > 1 && (
              <HeroCascadeItem>
                <HeroCarouselDots
                  count={banners.length}
                  activeIndex={idx}
                  onSelect={setIdx}
                  className="pt-2 md:hidden"
                />
              </HeroCascadeItem>
            )}
          </HeroTextCascade>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Bannière précédente"
            className="ivod-btn hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-black/50 border border-white/[0.12] text-white/80 hover:text-brand-magenta hover:border-brand-magenta/40 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Bannière suivante"
            className="ivod-btn hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-black/50 border border-white/[0.12] text-white/80 hover:text-brand-magenta hover:border-brand-magenta/40 backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={22} />
          </button>

          <div
            className={`absolute bottom-4 right-4 z-30 md:bottom-6 md:right-8 ${HOME_BLOCK} hidden md:flex justify-end pointer-events-none`}
          >
            <div className="hero-carousel-controls pointer-events-auto">
              <p className="hero-carousel-controls__label" aria-hidden>
                Bannière {idx + 1}/{banners.length}
              </p>
              {!reducedMotion && !paused && (
                <div className="hero-carousel-controls__track" aria-hidden>
                  <motion.div
                    key={idx}
                    className="hero-carousel-controls__fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                  />
                </div>
              )}
              <HeroCarouselDots count={banners.length} activeIndex={idx} onSelect={setIdx} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryPills() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`${HOME_BLOCK} mt-4 md:mt-5 mb-2`}
      variants={staggerContainer(reduced)}
      initial="hidden"
      animate="show"
    >
      <ScrollRow scrollClassName="rail-scroll flex gap-2 pb-1 scrollbar-none snap-x snap-proximity">
        {QUICK_LINKS.map(({ label, href, icon }) => (
          <CategoryPillLink key={href} href={href} label={label} icon={icon} />
        ))}
      </ScrollRow>
    </motion.div>
  );
}

function DefaultHero({
  isAuthenticated,
  displayName,
  planCode,
}: {
  isAuthenticated: boolean;
  displayName?: string | null;
  planCode?: string;
}) {
  const greeting = displayName?.trim()
    ? `Bon retour, ${displayName.trim()}`
    : "Bon retour sur iVOD";

  return (
    <div className={HERO_CLASS}>
      <HeroKenBurnsLayer>
        <Image src="/hero/hero.png" alt="iVOD" fill className={HERO_IMAGE_CLASS} priority sizes="100vw" />
      </HeroKenBurnsLayer>
      <HeroVignette />
      <div className={`${HOME_HERO_CONTENT_POS} ${HOME_BLOCK}`}>
      <HeroTextCascade className="max-w-3xl">
        <HeroCascadeItem>
          <p className="text-caption font-semibold text-brand-magenta mb-3">
            {isAuthenticated ? greeting : "Cinéma & séries africains"}
          </p>
        </HeroCascadeItem>
        <HeroCascadeItem>
          <div className="ivod-line-accent w-12 mb-4" />
        </HeroCascadeItem>
        <HeroCascadeItem>
          <HeroTitleGlow>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.12] mb-3">
              {isAuthenticated ? "Que voulez-vous regarder ?" : "Films & séries africains"}
            </h1>
          </HeroTitleGlow>
        </HeroCascadeItem>
        <HeroCascadeItem>
          <p className="text-white/75 text-sm md:text-base font-light mb-6 max-w-xl">
            {isAuthenticated
              ? "Retrouvez vos favoris, reprenez vos lectures et explorez le catalogue."
              : "Des milliers de contenus africains en streaming. Pass 24h dès 150 FCFA ou Premium à 1 500 FCFA/mois."}
          </p>
        </HeroCascadeItem>
        <HeroCascadeItem>
          <div className={HERO_CTA_ROW}>
            <Link href="/films" className={`${BTN_PRIMARY} ${HERO_CTA_LINK}`}>
              <Play size={18} className="fill-white shrink-0" />
              Explorer les films
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/favorites" className={`${BTN_GHOST} ${HERO_CTA_LINK}`}>
                  <Heart size={18} className="shrink-0 text-brand-magenta" fill="currentColor" fillOpacity={0.35} />
                  Ma liste
                </Link>
                {planCode !== "PREMIUM" && (
                  <Link href="/pricing" className={`${BTN_GHOST} ${HERO_CTA_LINK}`}>
                    Voir les tarifs
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/pricing" className={`${BTN_GHOST} ${HERO_CTA_LINK}`}>
                  Voir les tarifs
                </Link>
                <Link href="/auth/register" className={`${BTN_GHOST} ${HERO_CTA_LINK}`}>
                  S&apos;inscrire gratuitement
                </Link>
              </>
            )}
          </div>
        </HeroCascadeItem>
      </HeroTextCascade>
      </div>
    </div>
  );
}

function SubscribeCta() {
  return (
    <HomeSectionReveal className={HOME_BLOCK}>
      <div className="home-cta-shimmer relative rounded-none overflow-hidden border border-white/[0.06] bg-white/[0.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.12] via-transparent to-secondary/[0.06]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 blur-[100px] pointer-events-none" />
        <div className="relative px-6 sm:px-10 py-10 md:py-14 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-none border border-brand-magenta/30 bg-brand-purple/15 mb-5">
            <Sparkles size={18} className="text-brand-magenta" strokeWidth={1.75} />
          </div>
          <p className="text-caption font-semibold text-brand-magenta mb-2">
            iVOD Premium
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
            Accédez à tout le catalogue
          </h2>
          <div className="mx-auto ivod-line-accent w-10 mb-4" />
          <p className="text-[14px] text-white/50 font-light max-w-md mx-auto mb-8">
            Abonnez-vous dès 1 500 FCFA/mois — ou un pass 24h à partir de 150 FCFA, paiement sécurisé via Paystack.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/register" className={`${BTN_PRIMARY} home-btn-lift`}>
              Commencer gratuitement
            </Link>
            <Link href="/pricing" className={`${BTN_GHOST} home-btn-lift`}>
              Voir tous les tarifs
            </Link>
          </div>
          <div className="mt-8 max-w-lg mx-auto">
            <TrustPaymentBar compact />
          </div>
        </div>
      </div>
    </HomeSectionReveal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function HomepageClient() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const activeProfile = useProfileStore((s) => s.getActiveProfile());
  const heroDisplayName =
    activeProfile?.name?.trim() || user?.firstName?.trim() || user?.name?.trim() || null;
  const { detectedCountry } = useUIStore();

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: () => get<any>("/subscriptions/me", true),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
  const planCode = (currentSub as any)?.plan ?? "FREE";

  const { data: banners } = useQuery({
    queryKey: ["banners", detectedCountry, planCode],
    queryFn: () => {
      const country = detectedCountry ?? "CI";
      return get<any[]>(`/banners?country=${country}&plan=${planCode}`);
    },
    staleTime: 5 * 60_000,
  });

  const { data: history } = useQuery({
    queryKey: ["watch-history", activeProfileId],
    queryFn: () =>
      activeProfileId
        ? watchApi.getHistoryByProfile(activeProfileId, 1, 20)
        : watchApi.getHistory(1, 20),
    enabled: isAuthenticated,
    staleTime: 60_000,
    select: (data: any) => data?.items ?? [],
  });

  const bannerList: any[] = Array.isArray(banners) ? banners : [];

  const historyMap = (history ?? []).reduce((acc: Record<string, number>, h: any) => {
    if (h.contentId) acc[h.contentId] = h.percentage ?? 0;
    else if (h.content?.id) acc[h.content.id] = h.percentage ?? 0;
    return acc;
  }, {});

  return (
    <div className="pb-6 md:pb-10 overflow-x-hidden">
      {banners === undefined ? (
        <HeroSkeleton />
      ) : bannerList.length > 0 ? (
        <HeroCarousel banners={bannerList} />
      ) : (
        <DefaultHero
          isAuthenticated={isAuthenticated}
          displayName={heroDisplayName}
          planCode={planCode}
        />
      )}

      <div className="relative z-10 space-y-12 md:space-y-14 pt-2 md:pt-3">
        <HomeContentAmbient />
        <CategoryPills />

        <CatalogRails surface="home" historyMap={historyMap} />

        <CreatorsSpotlightRail />

        {!isAuthenticated && <SubscribeCta />}
      </div>
    </div>
  );
}
