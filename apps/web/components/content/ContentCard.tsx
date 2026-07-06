"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Info, Star, Sparkles } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import {
  cardCoverUrl,
  type ContentImageFields,
} from "@/lib/utils/assets";
import { formatDuration } from "@/lib/utils/format";
import { useViewport } from "@/lib/providers/ViewportProvider";
import { contentDetailHref, isSeriesContentType } from "@/lib/utils/content-type";
import {
  formatSeriesPlayLabel,
  type SeriesPlayTarget,
} from "@/lib/utils/series-play";
import { buildResumeWatchHref } from "@/lib/utils/watch-resume";
import {
  CARD_OVERLAY_BADGE,
  CARD_TYPE_BADGE_CLASS,
  shouldShowOfferBadgeOnCard,
  viewerOfferBadgeClass,
  viewerOfferLabel,
} from "@/lib/constants/monetization";
import { useAuthStore } from "@/lib/stores/auth.store";

export interface ContentCardContent extends ContentImageFields {
  id: string;
  title: string;
  slug?: string;
  duration?: number | null;
  averageRating?: number;
  releaseYear?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  contentType?: { code: string; label: string } | string;
  contentGenres?: Array<{ genre: { code: string; label: string } }>;
  genres?: Array<{ code: string; label: string }>;
  mediaAssets?: Array<{ type: { code: string }; objectKey: string; isPrimary: boolean }>;
  isExclusive?: boolean;
  visibility?: string | null;
  ppvPrice?: number | null;
  likeCount?: number;
  maturityRating?: { code: string; label?: string } | null;
  playTarget?: SeriesPlayTarget | null;
}

interface ContentCardProps {
  content: ContentCardContent;
  progress?: number | null;
  showProgress?: boolean;
  /** @deprecated Utiliser `variant` */
  layout?: "grid" | "row";
  variant?: "rail" | "grid";
  playHref?: string;
  playTarget?: SeriesPlayTarget | null;
  size?: "sm" | "md" | "lg" | "xl";
  onBeforeNavigate?: () => void;
  /** Ligne meta additionnelle (ex. S1E3 sur « Continuer ») */
  extraMeta?: string;
}

const DIMS = {
  sm: { w: 132, h: 198 },
  md: { w: 168, h: 252 },
  lg: { w: 220, h: 330 },
  xl: { w: 248, h: 372 },
} as const;

export const CONTENT_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8";

function normalizeGenres(content: ContentCardContent) {
  if (content.genres?.length) return content.genres;
  return content.contentGenres?.map((g) => g.genre) ?? [];
}

function CardHoverActions({
  synopsis,
  showPlayButton,
  playLabel,
  goWatch,
  goDetail,
}: {
  synopsis: string | null;
  showPlayButton: boolean;
  playLabel: string;
  goWatch: (e: React.MouseEvent) => void;
  goDetail: () => void;
}) {
  return (
    <div className="relative p-3 pt-10 space-y-2 pointer-events-auto">
      {synopsis && (
        <p className="hidden sm:block text-xs text-white/65 line-clamp-2 leading-relaxed">
          {synopsis}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        {showPlayButton && (
          <button
            type="button"
            onClick={goWatch}
            className="inline-flex flex-1 min-w-0 items-center justify-center gap-2 h-9 px-3 rounded-none ivod-btn-primary text-xs font-bold"
          >
            <Play size={14} className="fill-white shrink-0" />
            <span className="truncate">{playLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goDetail();
          }}
          className="ivod-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-white/12 text-white border border-white/15 hover:bg-white/20 transition-colors"
          aria-label="Ajouter à ma liste"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goDetail();
          }}
          className="ivod-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-white/12 text-white border border-white/15 hover:bg-white/20 transition-colors"
          aria-label="Plus d'informations"
        >
          <Info size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export function ContentCard({
  content,
  progress,
  showProgress = false,
  layout,
  variant,
  playHref,
  playTarget: playTargetProp,
  size: sizeProp,
  onBeforeNavigate,
  extraMeta,
}: ContentCardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { reducedMotion, canHover, isNarrowViewport } = useViewport();
  const [touchActive, setTouchActive] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const resolvedVariant = variant ?? (layout === "grid" ? "grid" : "rail");
  const isRail = resolvedVariant === "rail";
  const size = sizeProp ?? (isRail ? (isNarrowViewport ? "md" : "xl") : "md");

  const posterUrl = cardCoverUrl(content);
  const dims = DIMS[size];

  const typeCode =
    typeof content.contentType === "string" ? content.contentType : content.contentType?.code;
  const typeLabel =
    typeof content.contentType === "object" && content.contentType?.label
      ? content.contentType.label
      : typeCode;

  const genres = normalizeGenres(content).slice(0, 3);
  const synopsis =
    content.shortDescription?.trim() ||
    content.description?.trim()?.slice(0, 100) ||
    null;

  const pct = progress ?? 0;
  const showBar = (showProgress || pct > 0) && pct > 0 && pct < 98;
  const hasProgress = pct > 2 && pct < 98;

  const isSeries = isSeriesContentType(typeCode);
  const playTarget = playTargetProp ?? content.playTarget ?? null;

  let playLabel = hasProgress ? "Reprendre" : "Lecture";
  if (isSeries && playTarget) {
    playLabel = formatSeriesPlayLabel(playTarget, hasProgress ? "resume" : "play");
  }

  const defaultWatchUrl =
    isSeries && playTarget
      ? buildResumeWatchHref(content.id, playTarget.episodeId)
      : `/watch/${content.id}`;
  const watchUrl = playHref ?? defaultWatchUrl;
  const showPlayButton = !isSeries || !!playTarget;
  const detailUrl = contentDetailHref(content.id, typeCode);

  const metaParts = [
    extraMeta,
    content.releaseYear,
    content.duration ? formatDuration(content.duration) : null,
    genres[0]?.label,
  ].filter(Boolean);

  const offerLabel = viewerOfferLabel(content.visibility, content.ppvPrice);

  const primaryBadge = (() => {
    if (
      shouldShowOfferBadgeOnCard(isAuthenticated, content.visibility, offerLabel)
    ) {
      return {
        label: offerLabel,
        className: viewerOfferBadgeClass(content.visibility),
        icon: null as typeof Sparkles | null,
      };
    }
    if (content.isExclusive) {
      return {
        label: "Exclusif",
        className: `${CARD_OVERLAY_BADGE} gap-1 ivod-gradient text-white border border-white/20`,
        icon: Sparkles,
      };
    }
    if (typeCode) {
      return {
        label: typeLabel ?? typeCode,
        className: `${CARD_OVERLAY_BADGE} ${CARD_TYPE_BADGE_CLASS[typeCode] ?? "bg-[#00050d]/90 text-white border border-white/25"}`,
        icon: null,
      };
    }
    return null;
  })();

  const goDetail = useCallback(() => {
    onBeforeNavigate?.();
    router.push(detailUrl);
  }, [router, detailUrl, onBeforeNavigate]);

  const handleCardActivate = useCallback(() => {
    if (!canHover && !touchActive) {
      setTouchActive(true);
      return;
    }
    goDetail();
  }, [canHover, touchActive, goDetail]);

  const handleShellBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTouchActive(false);
    }
  }, []);

  useEffect(() => {
    if (!touchActive || canHover) return;
    const dismiss = (e: PointerEvent) => {
      if (!shellRef.current?.contains(e.target as Node)) {
        setTouchActive(false);
      }
    };
    document.addEventListener("pointerdown", dismiss, { capture: true });
    return () => document.removeEventListener("pointerdown", dismiss, { capture: true });
  }, [touchActive, canHover]);

  const goWatch = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(watchUrl);
    },
    [router, watchUrl],
  );

  const bottomPad = showBar ? "pb-2" : "pb-3";

  return (
    <article
      className={`group/card relative flex-shrink-0 snap-start overflow-hidden ${isRail ? "" : "w-full"}`}
      style={isRail ? { width: dims.w, height: dims.h } : undefined}
    >
      <div
        ref={shellRef}
        className={`content-card-shell relative w-full overflow-hidden cursor-pointer ${isRail ? "h-full" : "aspect-[2/3]"}`}
        data-touch-active={!canHover && touchActive ? "true" : undefined}
        role="button"
        tabIndex={0}
        onClick={handleCardActivate}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (!canHover && !touchActive) {
            setTouchActive(true);
            return;
          }
          goDetail();
        }}
        onBlurCapture={handleShellBlur}
      >
        <div className="absolute inset-0 bg-background-elevated overflow-hidden">
          <MediaImage
            src={posterUrl}
            alt=""
            fill
            fallbackVariant="poster"
            fallbackTitle={content.title}
            fallbackGenreCode={genres[0]?.code}
            className="relative z-[1] object-cover content-card-media-zoom"
            sizes="(max-width: 768px) 50vw, 320px"
          />
        </div>

        {/* Dégradés — toujours présents pour ancrer le contenu */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-[#00050d]/95 via-[#00050d]/35 to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 z-[2] h-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none"
          aria-hidden
        />

        {primaryBadge && (() => {
          const BadgeIcon = primaryBadge.icon;
          return (
            <div className="absolute top-2 left-2 right-10 z-[3]">
              <span className={primaryBadge.className}>
                {BadgeIcon && <BadgeIcon size={10} className="shrink-0" />}
                {primaryBadge.label}
              </span>
            </div>
          );
        })()}

        {content.averageRating != null && content.averageRating > 0 && (
          <div className="absolute top-2.5 right-2.5 z-[3] flex items-center gap-1 bg-black/70 px-2 py-1 border border-white/10">
            <Star size={12} className="text-secondary fill-secondary" />
            <span className="text-[12px] font-semibold text-white tabular-nums">
              {content.averageRating.toFixed(1)}
            </span>
          </div>
        )}

        {showBar && (
          <div className="absolute bottom-0 left-0 right-0 z-[5] h-1 bg-white/10 overflow-hidden">
            <div
              className="h-full content-card-progress-bar relative transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            >
              {!reducedMotion && (
                <span className="content-card-progress-shine absolute inset-0" aria-hidden />
              )}
            </div>
          </div>
        )}

        {/* Pied de carte — rail & mobile ; grille garde le titre sous la carte */}
        <div
          className={`absolute left-0 right-0 z-[3] px-3 pointer-events-none transition-opacity duration-300 ${bottomPad} ${showBar ? "bottom-1" : "bottom-0"} ${!isRail ? "sm:opacity-0" : ""} ${!canHover && touchActive ? "opacity-0" : ""}`}
        >
          <div className="ivod-line-accent w-10 mb-2 opacity-90" aria-hidden />
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 tracking-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
            {content.title}
          </h3>
          {metaParts.length > 0 && (
            <p className="mt-1 text-[11px] font-medium text-white/55 line-clamp-1 tracking-wide">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>

        {/* Desktop : hover discret */}
        {canHover && !reducedMotion && (
          <div className="absolute inset-0 z-[4] flex flex-col justify-end opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity duration-300 bg-black/40 [@media(hover:hover)]:group-hover/card:bg-gradient-to-t [@media(hover:hover)]:group-hover/card:from-black/90 [@media(hover:hover)]:group-hover/card:via-black/45 [@media(hover:hover)]:group-hover/card:to-black/10">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="content-card-play-orb flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center ivod-gradient text-white opacity-90">
                <Play size={24} className="ml-0.5 fill-white" />
              </span>
            </div>
            <CardHoverActions
              synopsis={synopsis}
              showPlayButton={showPlayButton}
              playLabel={playLabel}
              goWatch={goWatch}
              goDetail={goDetail}
            />
          </div>
        )}

        {/* Touch : 1er tap révèle play + actions ; 2e tap → fiche */}
        {!canHover && (
          <div
            className="content-card-touch-overlay absolute inset-0 z-[4] flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/45 to-black/10"
            aria-hidden={!touchActive}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="content-card-play-orb flex h-12 w-12 items-center justify-center ivod-gradient text-white">
                <Play size={22} className="ml-0.5 fill-white" />
              </span>
            </div>
            <CardHoverActions
              synopsis={synopsis}
              showPlayButton={showPlayButton}
              playLabel={playLabel}
              goWatch={goWatch}
              goDetail={goDetail}
            />
          </div>
        )}

        {canHover && reducedMotion && (
          <div className="absolute inset-0 z-[4] flex flex-col justify-end opacity-0 focus-within:opacity-100 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-opacity">
            <CardHoverActions
              synopsis={synopsis}
              showPlayButton={showPlayButton}
              playLabel={playLabel}
              goWatch={goWatch}
              goDetail={goDetail}
            />
          </div>
        )}
      </div>

      {/* Titre sous carte — grille uniquement (rail : titre dans l’overlay) */}
      {!isRail && (
      <div className="mt-3 px-0.5">
        <p className="text-base font-semibold text-white line-clamp-1 transition-colors duration-300 [@media(hover:hover)]:group-hover/card:text-brand-magenta">
          {content.title}
        </p>
        {metaParts.length > 0 && (
          <p className="text-sm text-white/50 mt-1 line-clamp-1">{metaParts.join(" · ")}</p>
        )}
      </div>
      )}
    </article>
  );
}
