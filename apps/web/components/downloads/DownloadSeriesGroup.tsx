"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock, Trash2 } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { DownloadItemCard, type DownloadItemCardData } from "./DownloadItemCard";

const QUALITY_LABELS: Record<string, string> = {
  "480p": "SD",
  "720p": "HD",
  "1080p": "FHD",
};

type Props = {
  contentId: string;
  seriesTitle: string;
  thumb: string | null;
  items: DownloadItemCardData[];
  now: number;
  variant?: "active" | "expired";
  resolveEpisodeTitle: (row: DownloadItemCardData) => string;
  resolveWatchHref: (row: DownloadItemCardData) => string;
  onRemove: (id: string) => void;
  onRemoveAll?: (ids: string[]) => void;
  isRemoving?: boolean;
};

function minDaysLeft(items: DownloadItemCardData[], now: number): number | null {
  let min: number | null = null;
  for (const item of items) {
    if (!item.expiresAt) continue;
    const days = Math.ceil((new Date(item.expiresAt).getTime() - now) / 86_400_000);
    if (min === null || days < min) min = days;
  }
  return min;
}

function dominantQuality(items: DownloadItemCardData[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.quality) continue;
    counts.set(item.quality, (counts.get(item.quality) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [q, c] of counts) {
    if (c > bestCount) {
      best = q;
      bestCount = c;
    }
  }
  return best;
}

export function DownloadSeriesGroup({
  contentId,
  seriesTitle,
  thumb,
  items,
  now,
  variant = "active",
  resolveEpisodeTitle,
  resolveWatchHref,
  onRemove,
  onRemoveAll,
  isRemoving,
}: Props) {
  const expired = variant === "expired";
  const [expanded, setExpanded] = useState(items.length <= 2);
  const count = items.length;
  const daysLeft = minDaysLeft(items, now);
  const quality = dominantQuality(items);

  const handleRemoveAll = () => {
    if (onRemoveAll) {
      onRemoveAll(items.map((i) => i.id));
      return;
    }
    for (const item of items) onRemove(item.id);
  };

  if (expired) {
    return (
      <div className="border border-white/[0.05] bg-white/[0.02] opacity-70">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
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
            <p className="truncate text-sm text-white/60">{seriesTitle}</p>
            <p className="text-[11px] text-white/35">
              {count} épisode{count > 1 ? "s" : ""} expiré{count > 1 ? "s" : ""}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="space-y-1 border-t border-white/[0.04] px-2 pb-2 pt-1">
            {items.map((row) => (
              <DownloadItemCard
                key={row.id}
                row={row}
                thumb={thumb}
                title={resolveEpisodeTitle(row)}
                watchHref={resolveWatchHref(row)}
                now={now}
                variant="expired"
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-white/[0.08] bg-white/[0.03] transition-colors hover:border-white/[0.14]">
      <div className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
        <Link
          href={`/content/${contentId}`}
          className="relative h-[72px] w-[128px] shrink-0 overflow-hidden bg-black/50 shadow-lg"
        >
          <MediaImage
            src={thumb}
            alt={seriesTitle}
            fill
            className="object-cover"
            sizes="128px"
          />
          {quality && (
            <span className="absolute bottom-1 left-1 bg-black/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {QUALITY_LABELS[quality] ?? quality}
            </span>
          )}
          <span className="absolute right-1 top-1 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {count}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/content/${contentId}`}
            className="block truncate text-sm font-semibold text-white transition-colors hover:text-brand-magenta md:text-base"
          >
            {seriesTitle}
          </Link>
          <p className="mt-1 text-[12px] text-white/45">
            {count} épisode{count > 1 ? "s" : ""} téléchargé{count > 1 ? "s" : ""}
          </p>
          {daysLeft !== null && (
            <p
              className={`mt-1 inline-flex items-center gap-1 text-[12px] ${
                daysLeft <= 3 ? "text-amber-400" : "text-white/40"
              }`}
            >
              <Clock size={12} />
              {daysLeft <= 0 ? "Expire bientôt" : `Expire dans ${daysLeft}j`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleRemoveAll}
            disabled={isRemoving}
            aria-label={`Supprimer les ${count} épisodes`}
            className="ivod-btn flex h-9 w-9 items-center justify-center border border-transparent text-white/40 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Replier" : "Déplier les épisodes"}
            className="ivod-btn flex h-9 w-9 items-center justify-center border border-transparent text-white/50 hover:text-white"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-0.5 border-t border-white/[0.06] px-2 pb-2 pt-1 md:px-3">
          {items.map((row) => (
            <DownloadItemCard
              key={row.id}
              row={row}
              thumb={thumb}
              title={resolveEpisodeTitle(row)}
              watchHref={resolveWatchHref(row)}
              now={now}
              variant="nested"
              onRemove={onRemove}
              isRemoving={isRemoving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
