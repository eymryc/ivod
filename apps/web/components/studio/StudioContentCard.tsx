"use client";

import Link from "next/link";
import { ChevronRight, MoreHorizontal, Pencil } from "lucide-react";
import { MetaChip } from "@/components/studio/StudioContentMeta";
import { posterUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { ContentPreviewLinks } from "@/components/studio/ContentPreviewLinks";
import { isVideoPlayable } from "@/lib/utils/video";
import {
  formatCount,
  formatDate,
  formatDuration,
  formatRelative,
  formatXOF,
  resolveDurationSeconds,
} from "@/lib/utils/format";
import type { CreatorContentListItem } from "@/lib/types/studio-content";
import {
  isSeriesContentType,
  studioStructureHref,
  uploadButtonLabel,
  usesContentLevelVideo,
} from "@/lib/utils/content-type";

const STATUS_STYLES: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  DRAFT: {
    dot: "bg-brand-purple",
    badge: "bg-brand-purple/20 border-brand-purple/40 text-brand-purple",
    label: "text-brand-purple",
  },
  PENDING_REVIEW: {
    dot: "bg-brand-orange",
    badge: "bg-brand-orange/15 border-brand-orange/40 text-brand-orange",
    label: "text-brand-orange",
  },
  PUBLISHED: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    badge: "bg-emerald-500/15 border-emerald-400/35 text-emerald-300",
    label: "text-emerald-300",
  },
  REJECTED: {
    dot: "bg-red-400",
    badge: "bg-red-500/15 border-red-400/35 text-red-300",
    label: "text-red-300",
  },
};

const PIPELINE_BUSY = new Set([
  "UPLOADED",
  "PROBING",
  "TRANSCODING",
  "PACKAGING",
]);

const VIDEO_LABELS: Record<string, string> = {
  CREATED: "Créé",
  UPLOADED: "Uploadé",
  PROBING: "Analyse",
  TRANSCODING: "Encodage",
  PACKAGING: "Packaging",
  READY_PREVIEW: "Aperçu",
  READY: "Prêt",
  PUBLISHED: "En ligne",
  FAILED: "Échec",
};

function Dot({ className }: { className: string }) {
  return <span className={`inline-block w-2 h-2 shrink-0 ${className}`} />;
}


export function StudioContentCard({
  content,
  compact = false,
}: {
  content: CreatorContentListItem;
  compact?: boolean;
}) {
  const coverSrc = posterUrl(content);
  const views = content.stats?.totalViews ?? content.viewCount ?? 0;
  const likes = content.stats?.likeCount ?? content.likeCount ?? 0;
  const rating = content.stats?.averageRating ?? content.averageRating ?? 0;
  const isSeries = isSeriesContentType(content.contentType);
  const hasContentVideo = usesContentLevelVideo(content.contentType);
  const durationSec = resolveDurationSeconds(content.duration, content.videoDurationSec);
  const statusStyle = STATUS_STYLES[content.status] ?? STATUS_STYLES.DRAFT;

  const isEncoding = content.videoStatus && PIPELINE_BUSY.has(content.videoStatus);

  if (compact) {
    return (
      <article className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/[0.05] px-1 py-3 last:border-0 transition-colors hover:bg-white/[0.02]">
        <Link
          href={`/studio/contents/${content.id}`}
          className="studio-poster-frame relative h-[66px] w-11 shrink-0 overflow-hidden bg-brand-purple/10"
        >
          <MediaImage
            src={coverSrc}
            alt={content.title}
            fill
            className="object-cover"
            sizes="44px"
            fallbackClassName="absolute inset-0 text-[9px] text-brand-magenta/50"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${statusStyle.badge}`}
            >
              <Dot className={statusStyle.dot} />
              {content.statusLabel ?? content.status}
            </span>
            <span className="text-[10px] text-white/30">{content.contentTypeLabel}</span>
          </div>
          <Link href={`/studio/contents/${content.id}`} className="block min-w-0">
            <h2 className="mt-1 truncate text-[13px] font-medium text-white/90 group-hover:text-primary transition-colors">
              {content.title}
            </h2>
          </Link>
          <p className="mt-0.5 text-[11px] text-white/35">
            {formatCount(views)} vues
            {durationSec && hasContentVideo ? ` · ${formatDuration(durationSec)}` : ""}
          </p>
        </div>
        <Link
          href={`/studio/contents/${content.id}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white/25 transition-colors hover:text-primary"
          aria-label="Ouvrir"
        >
          <ChevronRight size={16} />
        </Link>
      </article>
    );
  }

  const genreLabels = content.genres.map((g) => g.label).slice(0, 2);

  return (
    <article className="group grid grid-cols-[auto_1fr_auto] gap-3 border-b border-white/[0.05] px-4 py-4 transition-colors last:border-0 hover:bg-white/[0.02] sm:grid-cols-[auto_1fr_auto] sm:gap-5 sm:px-5 sm:py-5">
      <Link
        href={`/studio/contents/${content.id}`}
        className="relative h-[90px] w-[60px] shrink-0 overflow-hidden border border-white/[0.08] bg-white/[0.03] ring-0 transition-all group-hover:border-primary/25 sm:h-[120px] sm:w-[80px]"
      >
        <MediaImage
          src={coverSrc}
          alt={content.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 60px, 80px"
          fallbackClassName="absolute inset-0 text-[10px] text-white/20"
        />
      </Link>

      <div className="flex min-w-0 flex-col justify-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusStyle.badge}`}
          >
            <Dot className={statusStyle.dot} />
            {content.statusLabel ?? content.status}
          </span>
          {content.contentTypeLabel ? (
            <MetaChip highlight>{content.contentTypeLabel}</MetaChip>
          ) : null}
          {content.isExclusive ? <MetaChip>Exclusif</MetaChip> : null}
          {hasContentVideo && isEncoding ? (
            <Link
              href={`/studio/contents/${content.id}/upload`}
              className="text-[10px] font-medium text-brand-orange hover:text-brand-gold"
            >
              Encodage…
            </Link>
          ) : null}
        </div>

        <Link href={`/studio/contents/${content.id}`} className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-snug text-white/95 transition-colors group-hover:text-primary sm:text-base">
            {content.title}
          </h2>
        </Link>

        <div className="flex flex-wrap gap-1">
          {content.releaseYear ? <MetaChip>{content.releaseYear}</MetaChip> : null}
          {durationSec && hasContentVideo ? (
            <MetaChip>{formatDuration(durationSec)}</MetaChip>
          ) : null}
          {genreLabels.map((g) => (
            <MetaChip key={g}>{g}</MetaChip>
          ))}
          {content.maturityRatingLabel ? (
            <MetaChip>{content.maturityRatingLabel}</MetaChip>
          ) : null}
          {hasContentVideo && content.videoStatus ? (
            <MetaChip highlight>
              {VIDEO_LABELS[content.videoStatus] ?? content.videoStatus}
            </MetaChip>
          ) : null}
          {isSeries && (content.seasonCount > 0 || content.episodeCount > 0) ? (
            <MetaChip>
              {content.seasonCount}S · {content.episodeCount} ép.
            </MetaChip>
          ) : null}
        </div>

        {content.shortDescription ? (
          <p className="line-clamp-1 text-[12px] leading-relaxed text-white/35">
            {content.shortDescription}
          </p>
        ) : null}

        <p className="text-[11px] text-white/30">
          {formatRelative(content.createdAt)}
          {content.publishedAt ? ` · Publié ${formatDate(content.publishedAt)}` : ""}
          {content.ppvPrice != null && content.ppvPrice > 0
            ? ` · ${formatXOF(content.ppvPrice)}`
            : ""}
        </p>

        {content.rejectionReason ? (
          <p className="line-clamp-1 border-l-2 border-red-400/40 pl-2 text-[11px] text-red-400">
            {content.rejectionReason}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-3 sm:hidden">
          <span className="text-[12px] tabular-nums text-white/55">
            {durationSec ? formatDuration(durationSec) : "—"}
          </span>
          <span className="text-[12px] tabular-nums text-white/40">
            {formatCount(views)} vues
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-3 sm:min-w-[148px]">
        <div className="hidden text-right sm:block">
          <p className="text-[15px] font-semibold tabular-nums text-white/85">
            {durationSec ? formatDuration(durationSec) : "—"}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-white/40">
            {formatCount(views)} vues
          </p>
          {(likes > 0 || rating > 0) && (
            <p className="mt-0.5 text-[10px] text-white/30">
              {likes > 0 ? `${formatCount(likes)} ♥` : ""}
              {likes > 0 && rating > 0 ? " · " : ""}
              {rating > 0 ? `${rating.toFixed(1)} ★` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <ContentPreviewLinks
            contentId={content.id}
            videoStatus={content.videoStatus}
            variant="icons"
            subtle
            showPlayLink={hasContentVideo}
          />
          {isSeries ? (
            <Link
              href={studioStructureHref(content.id)}
              className="inline-flex h-8 items-center border border-white/[0.08] px-2.5 text-[11px] font-medium text-white/55 transition-colors hover:border-secondary/30 hover:text-secondary"
            >
              Épisodes
            </Link>
          ) : (
            <Link
              href={`/studio/contents/${content.id}/upload`}
              className={`inline-flex h-8 items-center border px-2.5 text-[11px] font-medium transition-colors ${
                isVideoPlayable(content.videoStatus)
                  ? "border-white/[0.08] text-white/55 hover:border-primary/30 hover:text-primary"
                  : isEncoding
                    ? "border-brand-orange/25 text-brand-orange/90 hover:border-brand-orange/40"
                    : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              }`}
            >
              {uploadButtonLabel(
                isVideoPlayable(content.videoStatus),
                !!isEncoding,
                content.contentTypeLabel,
              )}
            </Link>
          )}
          <Link
            href={`/studio/contents/${content.id}`}
            className="hidden items-center gap-1 text-[11px] font-medium text-white/35 transition-colors hover:text-primary sm:inline-flex"
          >
            <Pencil size={12} />
            Éditer
          </Link>
          <Link
            href={`/studio/contents/${content.id}`}
            className="p-1.5 text-white/35 hover:text-primary sm:hidden"
            aria-label="Ouvrir"
          >
            <MoreHorizontal size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
