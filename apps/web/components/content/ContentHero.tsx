"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Play,
  Plus,
  ThumbsUp,
  Clapperboard,
  Share2,
  Download,
  Check,
  Loader2,
} from "lucide-react";
import { DownloadProgressBar } from "@/components/downloads/DownloadProgressBar";
import { MediaImage } from "@/components/ui/MediaImage";
import { posterUrl, assetUrl, coverUrl } from "@/lib/utils/assets";
import { formatDuration } from "@/lib/utils/format";
import {
  getWatchButtonLabel,
  requiresSubscription,
  type Entitlement,
} from "@/core/rules/entitlement";
import { isPaidPlan } from "@/lib/constants/monetization";
import { isVideoPlayable } from "@/lib/utils/video";
import { formatSeriesPlayLabel } from "@/lib/utils/series-play";
import {
  CONTENT_DETAIL_ACTION_COL_CLASS,
  CONTENT_DETAIL_HERO_BANNER_CLASS,
  CONTENT_DETAIL_HERO_GRID_CLASS,
  CONTENT_DETAIL_PAGE_SHELL,
} from "@/lib/constants/hero-layout";
import { HeroPreviewBackground } from "./HeroPreviewBackground";
import { CatalogHeroTrailerBackground } from "@/components/catalog/CatalogHeroTrailerBackground";
import { pickCatalogHeroPromo } from "@/lib/promo/hero-trailer";
import { TvodPurchaseModal } from "@/components/payment/TvodPurchaseModal";
import { LikeButton } from "./LikeButton";
import { PromoVideoBar } from "./PromoVideoBar";
import { HeroDetailMetaGrid } from "./HeroDetailMetaGrid";
import type { PromoVideosBundle } from "@/core/entities/promo.entity";

type CastEntry = {
  id: string;
  person?: { id?: string; fullName?: string };
  characterName?: string | null;
};

interface ContentHeroProps {
  content: {
    id: string;
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    releaseYear?: number | null;
    duration?: number | null;
    isExclusive?: boolean;
    ppvPrice?: number | null;
    publishedAt?: string | null;
    contentType?: { code: string; label: string } | string | null;
    contentGenres?: Array<{ genre: { code: string; label: string } }>;
    genres?: Array<{ code: string; label: string }>;
    maturityRating?: { code: string; label: string } | null;
    contentCasts?: CastEntry[];
    subtitleTracks?: Array<{ language?: { label?: string } }>;
    audioTracks?: Array<{ language?: { label?: string } }>;
    mediaAssets?: Array<{ type: { code: string }; objectKey: string; isPrimary: boolean }>;
    videoPosterObjectKey?: string | null;
    posterObjectKey?: string | null;
    thumbnailObjectKey?: string | null;
  };
  entitlement?: Entitlement | null;
  userProgress?: {
    watchedSeconds?: number;
    percentage?: number;
    completed?: boolean;
    lastWatchedAt?: string;
  } | null;
  resumeAt?: number | null;
  resumePercentage?: number | null;
  completed?: boolean;
  resumeHref?: string;
  enablePreview?: boolean;
  previewEpisodeId?: string | null;
  /** Vignette épisode / reprise — affichée si pas d’aperçu vidéo. */
  resumeHeroPosterSrc?: string | null;
  /** Série : cible de lecture (premier épisode ou reprise) pour le libellé type Prime */
  seriesPlayTarget?: { episodeId: string; seasonNumber: number; episodeNumber: number } | null;
  seriesWatchHref?: string | null;
  seriesRestartHref?: string | null;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  /** @deprecated Utiliser promoVideos + PromoVideoBar */
  onTrailerClick?: () => void;
  /** @deprecated */
  hasTrailer?: boolean;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
  onShare?: () => void;
  onDownload?: () => void;
  canDownload?: boolean;
  downloadProgress?: number | null;
  isDownloading?: boolean;
  planCode?: string | null;
  activeProfileId?: string | null;
  videoStatus?: string | null;
  videoPlayable?: boolean;
  isAuthenticated?: boolean;
  variant?: "detail" | "compact";
}

function IconAction({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`ivod-btn hero-detail-icon-btn flex flex-1 min-w-0 h-10 items-center justify-center ${
        active ? "hero-detail-icon-btn--active" : ""
      } disabled:opacity-40 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

function getIncludedLabel(
  entitlement: Entitlement | null | undefined,
  planCode?: string | null,
): string | null {
  if (!entitlement?.hasAccess) return null;
  if (entitlement.reason === "AVOD") return "Gratuit avec publicités";
  if (entitlement.reason === "TVOD") return "Achat à l'unité — accès débloqué";
  if (isPaidPlan(planCode)) {
    return "Inclus avec votre abonnement iVOD";
  }
  return "Inclus dans le catalogue iVOD";
}

export function ContentHero({
  content,
  entitlement,
  userProgress,
  resumeAt,
  resumePercentage,
  completed,
  resumeHref,
  enablePreview = false,
  previewEpisodeId,
  resumeHeroPosterSrc,
  seriesPlayTarget,
  seriesWatchHref,
  seriesRestartHref,
  onToggleFavorite,
  isFavorite,
  onTrailerClick,
  hasTrailer,
  promoVideos,
  comingSoon,
  onShare,
  onDownload,
  canDownload = false,
  downloadProgress = null,
  isDownloading = false,
  planCode,
  activeProfileId,
  videoStatus,
  videoPlayable,
  isAuthenticated = false,
  variant = "detail",
}: ContentHeroProps) {
  const [showTvodModal, setShowTvodModal] = useState(false);
  const isDetail = variant === "detail";

  const bgUrl =
    assetUrl(
      content.mediaAssets?.find((a) => a.type?.code === "BANNER")?.objectKey,
    ) ?? coverUrl(content) ?? posterUrl(content);

  const isSeries = !!seriesPlayTarget;
  const playable =
    isSeries || (videoPlayable ?? isVideoPlayable(videoStatus));
  const hasAccess = entitlement?.hasAccess === true;
  const isGeoBlocked = entitlement?.reason === "GEO_BLOCKED";
  const isTvod = entitlement?.reason === "TVOD" && !hasAccess;
  const needsSubscription = requiresSubscription(entitlement);
  const progressPct = Math.min(100, Math.max(0, Number(resumePercentage ?? 0)));
  const hasProgress =
    !completed &&
    (progressPct >= 1 && progressPct < 92 || (resumeAt != null && resumeAt > 15));

  let watchLabel = getWatchButtonLabel(
    entitlement,
    content.ppvPrice,
    resumeAt,
    resumePercentage,
    completed,
  );
  if (seriesPlayTarget && hasAccess && !isTvod && !isGeoBlocked) {
    watchLabel = formatSeriesPlayLabel(
      seriesPlayTarget,
      hasProgress ? "resume" : "play",
    );
  }

  const heroPromo = pickCatalogHeroPromo(promoVideos, { comingSoon });
  /** Série — épisode en cours : vignette statique + play centré (pas de BA ni d’aperçu vidéo). */
  const isEpisodeResumeHero =
    isDetail && isSeries && hasProgress && Boolean(previewEpisodeId);
  /** Reprise film ou série sans vignette épisode. */
  const preferResumeHero =
    hasProgress && Boolean(previewEpisodeId || (!isSeries && playable));
  /** BA (ou teaser) — uniquement sans reprise en cours. */
  const showPromoTrailer = isDetail && Boolean(heroPromo) && !preferResumeHero;
  /** Aperçu vidéo court — films uniquement (jamais sur épisode en reprise). */
  const showContentPreview =
    isDetail &&
    !showPromoTrailer &&
    !isEpisodeResumeHero &&
    enablePreview &&
    hasAccess &&
    playable &&
    !isSeries;
  const heroPosterSrc = isEpisodeResumeHero
    ? resumeHeroPosterSrc ?? bgUrl
    : preferResumeHero && resumeHeroPosterSrc
      ? resumeHeroPosterSrc
      : bgUrl;
  const showResumeBar =
    isDetail &&
    progressPct >= 1 &&
    progressPct < 98 &&
    !completed &&
    (isEpisodeResumeHero || !isSeries);

  const watchHref = hasAccess
    ? (resumeHref ?? seriesWatchHref ?? `/watch/${content.id}`)
    : needsSubscription
      ? "/settings/subscription"
      : playable && !isAuthenticated
        ? `/auth/login?redirect=${encodeURIComponent(`/watch/${content.id}`)}`
        : playable && entitlement === undefined
          ? `/watch/${content.id}`
          : null;

  const genres =
    content.genres ??
    content.contentGenres?.map((cg) => cg.genre) ??
    [];
  const heroDescription =
    content.description?.trim() || content.shortDescription?.trim() || null;
  const includedLabel = getIncludedLabel(entitlement, planCode);

  const metaParts = [
    ...genres.slice(0, 3).map((g) => g.label),
    content.releaseYear ? String(content.releaseYear) : null,
    content.duration ? formatDuration(content.duration) : null,
  ].filter(Boolean);

  const handleWatchClick = (e: React.MouseEvent) => {
    if (isTvod && content.ppvPrice) {
      e.preventDefault();
      setShowTvodModal(true);
    }
  };

  const playButtonClass = isSeries
    ? "ivod-btn hero-detail-play-btn hero-detail-play-btn--series flex w-full max-w-full sm:max-w-[280px] items-center justify-center gap-2.5 rounded-none px-5 py-3 text-[15px] font-bold transition-all"
    : "ivod-btn ivod-btn-primary hero-detail-play-btn flex w-full max-w-full sm:max-w-[240px] items-center justify-center gap-2.5 px-6 py-3 text-[15px] font-bold text-white transition-all";

  const playButtonMuted =
    "ivod-btn flex w-full max-w-full sm:max-w-[240px] items-center justify-center gap-2.5 border border-white/20 bg-white/[0.06] px-6 py-3 text-[15px] font-bold text-white/40";

  const playButton = isGeoBlocked ? (
    <button type="button" disabled className={`${playButtonMuted} cursor-not-allowed`}>
      <Play size={22} className="fill-current" />
      Non disponible
    </button>
  ) : isTvod ? (
    <button type="button" onClick={handleWatchClick} className={playButtonClass}>
      <Play size={22} className={isSeries ? "fill-[#0f1419]" : "fill-white"} />
      {watchLabel}
    </button>
  ) : watchHref && playable ? (
    <Link href={watchHref} className={playButtonClass}>
      <Play size={22} className={isSeries ? "fill-[#0f1419]" : "fill-white"} />
      {!isAuthenticated && !hasAccess ? "Lecture" : watchLabel}
    </Link>
  ) : playable && !watchHref ? (
    <span className={playButtonMuted}>
      <Play size={22} />
      Chargement…
    </span>
  ) : null;

  if (!isDetail) {
    return (
      <CompactHero
        content={content}
        bgUrl={bgUrl}
        metaParts={metaParts}
        playButton={playButton}
        showTvodModal={showTvodModal}
        setShowTvodModal={setShowTvodModal}
        onToggleFavorite={onToggleFavorite}
        isFavorite={isFavorite}
        promoVideos={promoVideos}
        comingSoon={comingSoon}
      />
    );
  }

  return (
    <>
      {showTvodModal && content.ppvPrice && (
        <TvodPurchaseModal
          contentId={content.id}
          contentTitle={content.title}
          ppvPrice={content.ppvPrice}
          onClose={() => setShowTvodModal(false)}
        />
      )}

      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw] overflow-x-hidden">
        {/* Bannière */}
        <div className={CONTENT_DETAIL_HERO_BANNER_CLASS}>
          <div className="absolute inset-0 bg-background">
            {showPromoTrailer && heroPromo ? (
              <CatalogHeroTrailerBackground promoId={heroPromo.id} posterSrc={bgUrl} />
            ) : isEpisodeResumeHero ? (
              <>
                <MediaImage
                  src={heroPosterSrc}
                  alt=""
                  fill
                  className="object-cover object-center scale-110 blur-2xl brightness-[0.45] saturate-125"
                  sizes="100vw"
                  fallbackClassName="absolute inset-0"
                  aria-hidden
                />
                <MediaImage
                  src={heroPosterSrc}
                  alt=""
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="100vw"
                  fallbackClassName="absolute inset-0"
                />
              </>
            ) : showContentPreview ? (
              <HeroPreviewBackground
                contentId={content.id}
                episodeId={previewEpisodeId}
                posterSrc={heroPosterSrc}
                enabled={showContentPreview}
                startPositionSec={hasProgress ? resumeAt ?? undefined : undefined}
              />
            ) : (
              <MediaImage
                src={heroPosterSrc}
                alt=""
                fill
                className="object-cover object-[center_25%]"
                priority
                sizes="100vw"
                fallbackClassName="absolute inset-0"
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#00050d] via-[#00050d]/55 to-[#00050d]/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#00050d]/90 via-transparent to-transparent" />

          {isEpisodeResumeHero && !isGeoBlocked && (
            <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none">
              {isTvod ? (
                <button
                  type="button"
                  onClick={handleWatchClick}
                  className="pointer-events-auto flex flex-col items-center gap-2.5 group"
                  aria-label={watchLabel}
                >
                  <span className="flex h-[4.5rem] w-[4.5rem] md:h-20 md:w-20 items-center justify-center ivod-gradient shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105">
                    <Play size={34} className="fill-white ml-1" />
                  </span>
                  {progressPct > 0 ? (
                    <span className="text-sm font-semibold text-white drop-shadow-md">
                      Reprendre · {Math.round(progressPct)} %
                    </span>
                  ) : null}
                </button>
              ) : watchHref && playable ? (
                <Link
                  href={watchHref}
                  className="pointer-events-auto flex flex-col items-center gap-2.5 group"
                  aria-label={watchLabel}
                >
                  <span className="flex h-[4.5rem] w-[4.5rem] md:h-20 md:w-20 items-center justify-center ivod-gradient shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105">
                    <Play size={34} className="fill-white ml-1" />
                  </span>
                  {progressPct > 0 ? (
                    <span className="text-sm font-semibold text-white drop-shadow-md">
                      Reprendre · {Math.round(progressPct)} %
                    </span>
                  ) : null}
                </Link>
              ) : null}
            </div>
          )}

          <div className="absolute top-8 left-6 md:left-12 lg:left-16 z-10 max-w-4xl">
            <div className="w-14 md:w-20 ivod-line-accent mb-3 opacity-90" aria-hidden />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
              {content.title}
            </h1>
            {heroDescription && (
              <p className="mt-3 md:mt-4 max-w-3xl text-sm md:text-[15px] leading-relaxed text-white/88 text-justify drop-shadow-md">
                {heroDescription}
              </p>
            )}
          </div>

          {showResumeBar && (
            <div
              className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/15"
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression de lecture"
            >
              <div
                className="h-full content-card-progress-bar transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Barre d’infos type Prime Video */}
        <div className="relative z-10 -mt-2 hero-detail-bar backdrop-blur-sm">
          <div className={`${CONTENT_DETAIL_PAGE_SHELL} py-6 md:py-8`}>
            <div className={CONTENT_DETAIL_HERO_GRID_CLASS}>
              {/* Colonne actions — même largeur que le bouton Lecture */}
              <div className={CONTENT_DETAIL_ACTION_COL_CLASS}>
                <div className="flex w-full flex-col gap-3">
                  <div className="flex w-full gap-1.5">
                    {onToggleFavorite && (
                      <IconAction
                        label={isFavorite ? "Retirer de ma liste" : "Ma liste"}
                        onClick={onToggleFavorite}
                        active={isFavorite}
                      >
                        {isFavorite ? (
                          <Check size={20} className="text-brand-magenta" />
                        ) : (
                          <Plus size={20} />
                        )}
                      </IconAction>
                    )}
                    {isAuthenticated && (
                      <LikeButton
                        contentId={content.id}
                        profileId={activeProfileId}
                        variant="icon"
                      />
                    )}
                    {onShare && (
                      <IconAction label="Partager" onClick={onShare}>
                        <Share2 size={18} />
                      </IconAction>
                    )}
                    {canDownload && onDownload && (
                      <IconAction
                        label={isDownloading ? "Téléchargement…" : "Télécharger"}
                        onClick={onDownload}
                        disabled={isDownloading}
                        active={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 size={18} className="animate-spin text-brand-magenta" />
                        ) : (
                          <Download size={18} />
                        )}
                      </IconAction>
                    )}
                  </div>

                  {canDownload && isDownloading && downloadProgress != null && (
                    <DownloadProgressBar
                      progress={downloadProgress}
                      size="sm"
                      className="w-full"
                    />
                  )}

                  {playButton}

                  {isSeries && hasProgress && seriesRestartHref && (
                    <Link
                      href={seriesRestartHref}
                      className="ivod-btn flex w-full max-w-full sm:max-w-[240px] items-center justify-center gap-2 border border-white/20 bg-white/[0.06] px-5 py-2.5 text-[13px] font-semibold text-white/70 transition-all hover:text-white hover:border-white/35"
                    >
                      <Play size={15} className="fill-white/70" />
                      Revoir depuis le début
                    </Link>
                  )}
                </div>

                <PromoVideoBar
                  contentTitle={content.title}
                  promoVideos={promoVideos}
                  comingSoon={comingSoon}
                  className="w-full"
                />

                {includedLabel && (
                  <p className="hero-detail-included flex items-start gap-2 text-xs w-full leading-snug font-medium">
                    <Check size={14} className="hero-detail-included-icon shrink-0 mt-0.5" />
                    {includedLabel}
                  </p>
                )}
                {needsSubscription && (
                  <p className="text-xs text-white/55 w-full">
                    <Link href="/settings/subscription" className="text-brand-magenta hover:underline">
                      S&apos;abonner
                    </Link>{" "}
                    pour regarder ce titre.
                  </p>
                )}
              </div>

              <div className="hero-detail-meta-panel order-1 min-w-0 lg:order-2">
                <HeroDetailMetaGrid content={content} entitlement={entitlement} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CompactHero({
  content,
  bgUrl,
  metaParts,
  playButton,
  showTvodModal,
  setShowTvodModal,
  onToggleFavorite,
  isFavorite,
  promoVideos,
  comingSoon,
}: {
  content: ContentHeroProps["content"];
  bgUrl: string | null;
  metaParts: (string | number | null)[];
  playButton: ReactNode;
  showTvodModal: boolean;
  setShowTvodModal: (v: boolean) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
}) {
  const heroDescription =
    content.description?.trim() || content.shortDescription?.trim() || null;

  return (
    <>
      {showTvodModal && content.ppvPrice && (
        <TvodPurchaseModal
          contentId={content.id}
          contentTitle={content.title}
          ppvPrice={content.ppvPrice}
          onClose={() => setShowTvodModal(false)}
        />
      )}
      <section className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[600px] rounded-none overflow-hidden">
        <div className="absolute inset-0 bg-background rounded-none overflow-hidden">
          <MediaImage
            src={bgUrl}
            alt=""
            fill
            className="object-cover object-[center_20%]"
            priority
            sizes="100vw"
            fallbackClassName="absolute inset-0"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10 max-w-2xl">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">{content.title}</h1>
          {heroDescription && (
            <p className="mb-4 text-sm text-white/80 leading-relaxed text-justify line-clamp-4">
              {heroDescription}
            </p>
          )}
          {metaParts.length > 0 && (
            <p className="text-sm text-white/75 mb-5">{metaParts.join(" · ")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {playButton}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? "Retirer de ma liste" : "Ma liste"}
                className={`ivod-btn inline-flex h-11 w-11 items-center justify-center border-2 ${
                  isFavorite
                    ? "border-brand-magenta bg-brand-magenta/20 text-brand-magenta"
                    : "border-white/50 bg-black/45 text-white"
                }`}
              >
                {isFavorite ? <Check size={22} /> : <Plus size={22} />}
              </button>
            )}
            <PromoVideoBar
              contentTitle={content.title}
              promoVideos={promoVideos}
              comingSoon={comingSoon}
            />
          </div>
        </div>
      </section>
    </>
  );
}
