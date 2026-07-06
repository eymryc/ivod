"use client";

import Link from "next/link";
import { Play, Info } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { cardCoverUrl } from "@/lib/utils/assets";
import { formatDuration } from "@/lib/utils/format";
import {
  contentDetailHref,
  isSeriesContentType,
  resolveContentTypeCode,
} from "@/lib/utils/content-type";
import { formatSeriesPlayLabel } from "@/lib/utils/series-play";
import {
  buildResumeWatchHref,
  canResumeSession,
  type WatchHistoryEntry,
} from "@/lib/utils/watch-resume";
import {
  shouldShowOfferBadgeOnCard,
  viewerOfferBadgeClass,
  viewerOfferLabel,
} from "@/lib/constants/monetization";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { ContentCardContent } from "@/components/content/ContentCard";
import type { CatalogSectionConfig } from "@/lib/catalog/sections";
import type { SeriesPlayTarget } from "@/lib/utils/series-play";

type FeaturedResume = WatchHistoryEntry & {
  episode?: { seasonNumber: number; episodeNumber: number } | null;
};

type Props = {
  content: ContentCardContent;
  progress?: number | null;
  /** Session d’historique pour reprise série (épisode réellement regardé). */
  resumeSession?: FeaturedResume | null;
  section: CatalogSectionConfig;
  total: number;
  /** Masquer l’affiche latérale quand une BA joue en fond (hero vidéo). */
  showSidePoster?: boolean;
};

function resolveHeroSeriesTarget(
  content: ContentCardContent,
  resumeSession?: FeaturedResume | null,
): SeriesPlayTarget | null {
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
  progress,
  resumeSession,
  section,
  total,
  showSidePoster = true,
}: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const poster = cardCoverUrl(content);
  const typeCode = resolveContentTypeCode(content);
  const offerLabel = viewerOfferLabel(content.visibility, content.ppvPrice);
  const showOfferBadge = shouldShowOfferBadgeOnCard(
    isAuthenticated,
    content.visibility,
    offerLabel,
  );
  const isSeries = isSeriesContentType(typeCode);
  const playTarget = isSeries ? resolveHeroSeriesTarget(content, resumeSession) : null;
  const pct = resumeSession?.percentage ?? progress ?? 0;
  const hasProgress = resumeSession
    ? canResumeSession(resumeSession)
    : pct > 2 && pct < 98;

  let playLabel = hasProgress ? "Reprendre" : "Lecture";
  if (isSeries && playTarget) {
    playLabel = formatSeriesPlayLabel(playTarget, hasProgress ? "resume" : "play");
  }

  const showPlayButton = !isSeries || Boolean(playTarget);
  const watchUrl =
    isSeries && playTarget
      ? buildResumeWatchHref(content.id, playTarget.episodeId)
      : `/watch/${content.id}`;
  const playHref = isAuthenticated
    ? watchUrl
    : `/auth/login?redirect=${encodeURIComponent(watchUrl)}`;

  const genres =
    content.genres ?? content.contentGenres?.map((g) => g.genre) ?? [];

  const meta = [
    content.releaseYear ? String(content.releaseYear) : null,
    content.duration ? formatDuration(content.duration) : null,
  ].filter(Boolean);

  const countLabel = `${total.toLocaleString("fr-CI")} titre${total > 1 ? "s" : ""}`;
  const heroDescription =
    content.description?.trim() || content.shortDescription?.trim() || null;

  return (
    <div
      className={`grid gap-6 lg:items-end ${
        showSidePoster
          ? "lg:grid-cols-[minmax(0,1fr)_minmax(180px,240px)] xl:grid-cols-[minmax(0,1fr)_260px] lg:gap-10"
          : "max-w-3xl"
      }`}
    >
      <div className={`min-w-0 ${showSidePoster ? "order-2 lg:order-1" : ""}`}>
        <p className="text-caption text-muted-token mb-3">
          {section.title}
          <span className="text-white/20 mx-2" aria-hidden>
            ·
          </span>
          <span className="tabular-nums text-secondary-token">{countLabel}</span>
        </p>

        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-8 bg-gradient-to-r from-brand-gold/80 to-brand-magenta/60 shrink-0" />
          <span className="catalog-hero-editorial-label text-[11px] font-semibold text-brand-gold">
            À la une
          </span>
        </div>

        <h2 className="font-display text-[clamp(1.75rem,5vw,3.5rem)] font-bold text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] max-w-4xl">
          {content.title}
        </h2>

        {(() => {
          const chips: { label: string; className: string }[] = [];
          if (showOfferBadge && offerLabel) {
            chips.push({ label: offerLabel, className: viewerOfferBadgeClass(content.visibility) });
          } else if (genres[0]) {
            chips.push({ label: genres[0].label, className: "catalog-hero-meta-chip--genre" });
          }
          if (showOfferBadge && genres[0]) {
            chips.push({ label: genres[0].label, className: "catalog-hero-meta-chip--genre" });
          }
          meta.forEach((m) => {
            if (m) chips.push({ label: m, className: "" });
          });
          if (chips.length === 0) return null;
          return (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.slice(0, 3).map((chip) => (
                <span
                  key={chip.label}
                  className={`catalog-hero-meta-chip rounded-none px-3 py-1 text-[11px] font-semibold tabular-nums ${chip.className}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          );
        })()}

        {heroDescription && (
          <p className="mt-4 text-[15px] md:text-base text-white/72 font-light leading-relaxed line-clamp-4 max-w-2xl">
            {heroDescription}
          </p>
        )}

        {hasProgress && (
          <div
            className="mt-5 max-w-md"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de lecture"
          >
            <div className="h-0.5 w-full bg-white/15 overflow-hidden">
              <div
                className="h-full content-card-progress-bar transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-7">
          {showPlayButton ? (
            <Link
              href={playHref}
              className={`ivod-btn hero-detail-play-btn inline-flex items-center gap-2.5 h-11 md:h-12 px-6 md:px-8 rounded-none text-sm md:text-[15px] font-bold transition-transform hover:scale-[1.02] ${
                isSeries && playTarget
                  ? "hero-detail-play-btn--series"
                  : "ivod-btn-primary"
              }`}
            >
              <Play
                size={18}
                className={`shrink-0 ${isSeries && playTarget ? "fill-[#0f1419]" : "fill-white"}`}
              />
              {playLabel}
            </Link>
          ) : null}
          <Link
            href={contentDetailHref(content.id, resolveContentTypeCode(content))}
            className="ivod-btn inline-flex items-center gap-2 h-11 md:h-12 px-5 rounded-none border border-white/20 bg-white/[0.06] text-white/90 text-sm font-semibold hover:bg-white/10 hover:border-white/30 transition-colors"
          >
            <Info size={17} className="shrink-0 opacity-80" />
            Plus d&apos;infos
          </Link>
        </div>
      </div>

      {showSidePoster && (
        <div className="catalog-hero-poster-wrap relative order-1 lg:order-2 mx-auto w-[min(44vw,210px)] sm:w-[min(40vw,230px)] lg:w-full lg:max-w-[280px] lg:mx-0 lg:justify-self-end">
          <div className="catalog-hero-poster-glow" aria-hidden />
          <div className="catalog-hero-poster relative aspect-[2/3] w-full overflow-hidden">
            <MediaImage
              src={poster}
              alt=""
              fill
              fallbackVariant="poster"
              fallbackTitle={content.title}
              fallbackGenreCode={genres[0]?.code}
              className="object-cover object-[center_12%]"
              sizes="(max-width: 1024px) 230px, 280px"
              priority
            />
            <div className="catalog-hero-poster-shine" aria-hidden />
          </div>
          <div className="catalog-hero-poster-accent" aria-hidden />
        </div>
      )}
    </div>
  );
}
