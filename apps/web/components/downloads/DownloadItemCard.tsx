"use client";

import Link from "next/link";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { formatDuration, formatRelative } from "@/lib/utils/format";

const QUALITY_LABELS: Record<string, string> = {
  "480p": "SD",
  "720p": "HD",
  "1080p": "FHD",
};

export type DownloadItemCardData = {
  id: string;
  content?: {
    id?: string;
    title?: string;
    duration?: number;
    thumbnailObjectKey?: string | null;
  };
  contentId?: string;
  episode?: {
    id?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  };
  episodeId?: string | null;
  expiresAt?: string;
  quality?: string;
  format?: string;
  title?: string;
};

type Props = {
  row: DownloadItemCardData;
  thumb: string | null;
  title: string;
  watchHref: string;
  now: number;
  variant?: "default" | "nested" | "expired";
  onRemove: (id: string) => void;
  isRemoving?: boolean;
};

export function DownloadItemCard({
  row,
  thumb,
  title,
  watchHref,
  now,
  variant = "default",
  onRemove,
  isRemoving,
}: Props) {
  const nested = variant === "nested";
  const expired = variant === "expired";
  const daysLeft = row.expiresAt
    ? Math.ceil((new Date(row.expiresAt).getTime() - now) / 86_400_000)
    : null;

  if (expired) {
    return (
      <div className="flex items-center gap-3 border border-white/[0.05] bg-white/[0.02] p-3">
        <div className="relative h-12 w-20 shrink-0 bg-black/30">
          <MediaImage
            src={thumb}
            alt=""
            fill
            className="object-cover opacity-60 grayscale"
            sizes="80px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/60">{title}</p>
          {row.expiresAt && (
            <p className="text-[11px] text-white/35">
              Expiré {formatRelative(row.expiresAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-2 text-white/35 hover:text-red-400"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <article
      className={`group flex items-center gap-3 transition-colors ${
        nested
          ? "border-l-2 border-brand-magenta/35 bg-white/[0.02] py-2.5 pl-3 pr-2 hover:bg-white/[0.04]"
          : "gap-4 border border-white/[0.08] bg-white/[0.03] p-3 hover:border-white/[0.16] hover:bg-white/[0.05] md:p-4"
      }`}
    >
      <Link
        href={watchHref}
        className={`relative shrink-0 overflow-hidden bg-black/50 shadow-lg ${
          nested ? "h-14 w-[84px]" : "h-[72px] w-[128px]"
        }`}
      >
        <MediaImage
          src={thumb}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes={nested ? "84px" : "128px"}
        />
        {row.quality && (
          <span className="absolute bottom-1 left-1 bg-black/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            {QUALITY_LABELS[row.quality] ?? row.quality}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={watchHref}>
          <h3
            className={`truncate font-semibold text-white transition-colors group-hover:text-brand-magenta ${
              nested ? "text-[13px]" : "text-sm md:text-base"
            }`}
          >
            {title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
          {!nested && row.content?.duration != null && row.content.duration > 0 && (
            <span>{formatDuration(row.content.duration)}</span>
          )}
          {daysLeft !== null && (
            <span
              className={`inline-flex items-center gap-1 ${
                daysLeft <= 3 ? "text-amber-400" : ""
              }`}
            >
              <Clock size={12} />
              {daysLeft <= 0 ? "Expire bientôt" : `${daysLeft}j restants`}
            </span>
          )}
          {!nested && row.format === "HLS" && (
            <span className="text-white/35">Package HLS</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        disabled={isRemoving}
        aria-label="Supprimer le téléchargement"
        className="ivod-btn flex h-9 w-9 shrink-0 items-center justify-center border border-transparent text-white/40 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
      >
        {isRemoving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>
    </article>
  );
}
