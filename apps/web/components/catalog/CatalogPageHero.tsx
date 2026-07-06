"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaImage } from "@/components/ui/MediaImage";
import { cardBackdropUrl, cardCoverUrl } from "@/lib/utils/assets";
import {
  CATALOG_PAGE_HERO_CLASS,
  CATALOG_PAGE_HERO_SHOWCASE_CLASS,
  CATALOG_PAGE_HERO_WITH_TRAILER_CLASS,
} from "@/lib/constants/catalog-hero-layout";
import { VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";
import { CatalogHeroFeatured } from "@/components/catalog/CatalogHeroFeatured";
import { CatalogHeroTrailerBackground } from "@/components/catalog/CatalogHeroTrailerBackground";
import { promoApi } from "@/lib/api/promo";
import { pickCatalogHeroPromo } from "@/lib/promo/hero-trailer";
import type { CatalogSectionConfig } from "@/lib/catalog/sections";
import type { ContentCardContent } from "@/components/content/ContentCard";

type Props = {
  section: CatalogSectionConfig;
  total: number;
  isLoading?: boolean;
  featured?: ContentCardContent | null;
  featuredProgress?: number | null;
  featuredResume?: {
    id: string;
    contentId: string;
    episodeId?: string | null;
    percentage?: number;
    completed?: boolean;
    watchedSeconds?: number;
    lastWatchedAt?: string;
    episode?: { seasonNumber: number; episodeNumber: number } | null;
  } | null;
  categoryNav?: ReactNode;
  filterAction?: ReactNode;
};

export function CatalogPageHero({
  section,
  total,
  isLoading,
  featured,
  featuredProgress,
  featuredResume,
  categoryNav,
  filterAction,
}: Props) {
  const hasFeatured = Boolean(featured && !isLoading);
  const useShowcaseHeight = section.catalogLayout === "genre-rows" || hasFeatured;
  const heroClass = useShowcaseHeight
    ? CATALOG_PAGE_HERO_SHOWCASE_CLASS
    : CATALOG_PAGE_HERO_CLASS;
  const poster = featured ? cardCoverUrl(featured) : null;
  const banner = featured ? cardBackdropUrl(featured) ?? poster : null;

  const { data: promoBundle } = useQuery({
    queryKey: ["catalog-hero-promo", featured?.id],
    queryFn: () => promoApi.getBundle(featured!.id),
    enabled: Boolean(hasFeatured && featured?.id),
    staleTime: 5 * 60_000,
  });
  const heroTrailer = pickCatalogHeroPromo(promoBundle, {
    comingSoon: promoBundle?.preferTeaser ?? false,
  });
  const hasTrailer = Boolean(heroTrailer);
  const staticBackdrop = hasTrailer ? poster : banner ?? poster;

  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw] -mt-16 overflow-x-hidden">
      <div
        className={`${heroClass}${hasTrailer ? ` ${CATALOG_PAGE_HERO_WITH_TRAILER_CLASS}` : ""}`}
      >
        <div className="absolute inset-0 bg-[#030508] overflow-hidden">
          {/* Fond dégradé toujours visible — pas de brume si l’image échoue */}
          <div className="catalog-hero-backdrop-fallback absolute inset-0" aria-hidden />

          {hasFeatured && hasTrailer && heroTrailer ? (
            <div className="catalog-hero-video-frame">
              <CatalogHeroTrailerBackground promoId={heroTrailer.id} posterSrc={poster} />
            </div>
          ) : staticBackdrop ? (
            <div
              className={
                useShowcaseHeight && hasFeatured
                  ? "catalog-hero-video-frame"
                  : `catalog-hero-backdrop-stage ${useShowcaseHeight ? "catalog-hero-backdrop-stage--showcase" : ""}`
              }
            >
              <MediaImage
                src={staticBackdrop}
                alt=""
                fill
                fallbackVariant="none"
                className={`catalog-hero-backdrop catalog-hero-backdrop--main object-cover transition-opacity duration-700 ${
                  useShowcaseHeight && hasFeatured
                    ? "catalog-hero-trailer-media"
                    : hasFeatured
                      ? "catalog-hero-backdrop--featured"
                      : "opacity-60"
                }`}
                priority
                sizes="100vw"
              />
            </div>
          ) : null}
        </div>

        <div className="catalog-hero-grade catalog-hero-grade--lateral pointer-events-none absolute inset-0" aria-hidden />
        <div className="catalog-hero-grade catalog-hero-grade--vertical pointer-events-none absolute inset-0" aria-hidden />
        {useShowcaseHeight && (
          <div className="catalog-hero-grade catalog-hero-grade--spotlight pointer-events-none absolute inset-0" aria-hidden />
        )}
        {filterAction && hasFeatured && (
          <div className={`absolute top-24 md:top-28 right-0 z-20 ${VIEWER_SHELL_WIDTH}`}>{filterAction}</div>
        )}

        <div
          className={`relative z-10 flex min-h-full flex-col justify-end ${VIEWER_SHELL_WIDTH} pb-5 md:pb-7 pt-24 md:pt-28`}
        >
          {hasFeatured ? (
            <div className="mb-5 md:mb-6">
              <CatalogHeroFeatured
                content={featured!}
                progress={featuredProgress}
                resumeSession={featuredResume ?? null}
                section={section}
                total={total}
                showSidePoster={!hasTrailer}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5 md:mb-6">
              <div className="min-w-0 max-w-3xl">
                <p className="text-caption font-semibold text-brand-magenta mb-2">
                  {section.kicker}
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                  {section.title}
                </h1>
                <div className="mt-3 ivod-line-accent w-14" />
                {section.description && (
                  <p className="mt-3 text-sm md:text-[15px] text-white/65 font-light max-w-xl leading-relaxed">
                    {section.description}
                  </p>
                )}
                <p className="mt-2 text-[13px] text-white/45 tabular-nums">
                  {isLoading ? (
                    "Chargement du catalogue…"
                  ) : (
                    <>
                      <span className="font-semibold text-white/75">
                        {total.toLocaleString("fr-CI")}
                      </span>{" "}
                      titre{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
                    </>
                  )}
                </p>
              </div>
              {filterAction}
            </div>
          )}

          {categoryNav ? (
            <nav
              className={`rail-scroll flex gap-2 pb-2 pt-3 -mx-4 px-4 md:-mx-6 md:px-6 scrollbar-none snap-x snap-proximity ${
                useShowcaseHeight ? "catalog-hero-nav rounded-t-xl md:rounded-t-2xl" : ""
              }`}
              aria-label="Catégories du catalogue"
            >
              {categoryNav}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}
