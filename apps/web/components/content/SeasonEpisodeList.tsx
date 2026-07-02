"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Lock, Play, Download, Clock, Loader2 } from "lucide-react";
import { useDownloadContent } from "@/lib/hooks/useDownloadContent";
import {
  downloadJobKey,
  useDownloadProgressStore,
} from "@/lib/stores/download-progress.store";
import { DownloadProgressBar } from "@/components/downloads/DownloadProgressBar";
import { episodeThumbnailUrl } from "@/lib/utils/assets";
import { formatDuration } from "@/lib/utils/format";
import { MediaImage } from "@/components/ui/MediaImage";
import { ScrollRow, ScrollRowArrows, useHorizontalScroll } from "@/components/home/ScrollRow";
import { IvodSelect } from "@/components/ui/IvodField";
import { formatEpisodeDisplayTitle } from "@/lib/utils/episode-display";

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description?: string | null;
  duration?: number | null;
  thumbnailObjectKey?: string | null;
}

interface Season {
  id: string;
  seasonNumber: number;
  title?: string | null;
  episodes?: Episode[];
}

interface WatchedEpisode {
  episodeId?: string;
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
}

interface SeasonEpisodeListProps {
  contentId: string;
  contentTitle?: string;
  seasons: Season[];
  canWatch: boolean;
  canDownload?: boolean;
  watchHistory?: WatchedEpisode[];
}

const EPISODE_CARD_WIDTH =
  "w-[16.5rem] sm:w-[18rem] md:w-[19.5rem] shrink-0 snap-start";

const EPISODE_ROW_SCROLL =
  "flex gap-4 md:gap-5 overflow-x-auto overflow-y-visible py-2 pb-3 scrollbar-none snap-x snap-mandatory";

const EPISODE_CARD_BASE = [
  "episode-card-rect group/ep relative flex flex-col overflow-hidden",
  "border border-white/[0.09] bg-[#060912]/90",
  "shadow-[0_10px_28px_rgba(0,0,0,0.4)]",
  "transition-all duration-300 ease-out",
  "hover:border-brand-magenta/40 hover:shadow-[0_14px_36px_rgba(230,0,126,0.14)]",
  "hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-magenta/55",
].join(" ");

function seasonSelectLabel(season: Season): string {
  const count = season.episodes?.length ?? 0;
  const base = season.title
    ? `Saison ${season.seasonNumber} — ${season.title}`
    : `Saison ${season.seasonNumber}`;
  return `${base} (${count} épisode${count > 1 ? "s" : ""})`;
}

function EpisodeCard({
  ep,
  contentId,
  canWatch,
  canDownload,
  watched,
  onDownload,
}: {
  ep: Episode;
  contentId: string;
  canWatch: boolean;
  canDownload: boolean;
  watched?: WatchedEpisode;
  onDownload: (episodeId: string) => void;
}) {
  const job = useDownloadProgressStore((s) => s.jobs[downloadJobKey(contentId, ep.id)]);
  const isDownloading =
    job != null && job.phase !== "complete" && job.phase !== "error";
  const downloadProgress = isDownloading ? job.progress : null;
  const pct = watched?.percentage ?? 0;
  const isCompleted = watched?.completed ?? false;
  const inProgress = pct > 0 && !isCompleted;
  const href = canWatch ? `/watch/${contentId}?ep=${ep.id}` : "#";
  const thumbSrc = episodeThumbnailUrl(ep.thumbnailObjectKey);
  const display = formatEpisodeDisplayTitle(ep.title, ep.episodeNumber);

  const cardClass = [
    EPISODE_CARD_BASE,
    EPISODE_CARD_WIDTH,
    !canWatch ? "pointer-events-none opacity-75 hover:translate-y-0 hover:shadow-[0_10px_28px_rgba(0,0,0,0.4)]" : "",
    isCompleted ? "border-white/[0.06]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div
        className="absolute inset-x-0 top-0 z-[4] h-0.5 origin-left scale-x-0 bg-gradient-to-r from-brand-purple via-brand-magenta to-brand-orange transition-transform duration-300 group-hover/ep:scale-x-100 group-focus-visible/ep:scale-x-100"
        aria-hidden
      />

      <div className="episode-card-media relative w-full overflow-hidden bg-[#0a0c14]">
        {thumbSrc ? (
          <MediaImage
            src={thumbSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover/ep:scale-[1.05]"
            sizes="(max-width: 640px) 208px, 232px"
            fallbackClassName="absolute inset-0 bg-[#12141c]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#141824] to-[#0a0c14]">
            <Play size={28} className="text-white/25" strokeWidth={1.25} />
          </div>
        )}

        <div
          className="content-card-grain pointer-events-none absolute inset-0 z-[1] opacity-[0.05]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#00050d] via-[#00050d]/25 to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-[#00050d]/50 via-transparent to-transparent" />

        <div className="absolute top-2.5 left-2.5 z-[3] flex items-center gap-1.5">
          <span className="inline-flex min-w-[2rem] items-center justify-center border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-white backdrop-blur-sm">
            E{ep.episodeNumber}
          </span>
          {isCompleted && (
            <span
              className="inline-flex h-6 w-6 items-center justify-center border border-emerald-400/30 bg-emerald-500/90 text-white"
              title="Épisode terminé"
            >
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </div>

        {ep.duration != null && ep.duration > 0 && (
          <span className="absolute bottom-2.5 left-2.5 z-[3] inline-flex items-center gap-1 border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/85 backdrop-blur-sm">
            <Clock size={10} className="opacity-70" />
            {formatDuration(ep.duration)}
          </span>
        )}

        {canWatch && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center bg-[#00050d]/50 opacity-0 transition-opacity duration-300 group-hover/ep:opacity-100 [@media(hover:none)]:opacity-0">
            <span className="flex h-11 w-11 items-center justify-center ivod-gradient shadow-[0_0_24px_rgba(230,0,126,0.35)] transition-transform duration-300 group-hover/ep:scale-105">
              <Play size={20} className="ml-0.5 fill-white text-white" strokeWidth={0} />
            </span>
          </div>
        )}

        {!canWatch && (
          <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-1.5 bg-[#00050d]/70 backdrop-blur-[2px]">
            <span className="flex h-10 w-10 items-center justify-center border border-white/15 bg-black/50">
              <Lock size={18} className="text-white/45" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Verrouillé
            </span>
          </div>
        )}

        {canDownload && canWatch && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload(ep.id);
            }}
            disabled={isDownloading}
            aria-label={`Télécharger ${ep.title}`}
            className="absolute top-2.5 right-2.5 z-[4] flex h-8 w-8 items-center justify-center border border-white/12 bg-black/65 text-white/70 backdrop-blur-sm transition-colors hover:border-brand-magenta/40 hover:text-brand-magenta disabled:opacity-40"
          >
            {isDownloading ? (
              <Loader2 size={14} className="animate-spin text-brand-magenta" />
            ) : (
              <Download size={14} />
            )}
          </button>
        )}

        {isDownloading && downloadProgress != null && (
          <div className="absolute bottom-0 left-0 right-0 z-[5] border-t border-brand-magenta/20 bg-black/80 px-2 py-1.5">
            <DownloadProgressBar progress={downloadProgress} size="sm" />
          </div>
        )}

        {inProgress && (
          <div className="absolute bottom-0 left-0 right-0 z-[4] h-1 bg-black/60">
            <div
              className="h-full content-card-progress-bar transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex min-h-[4.25rem] flex-col justify-center gap-0.5 border-t border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <p
          className={`text-[13px] font-semibold leading-snug line-clamp-1 ${
            isCompleted ? "text-white/50" : "text-white/95"
          }`}
        >
          {display.primary}
        </p>
        {display.secondary && (
          <p className="text-[11px] leading-snug text-white/45 line-clamp-1">{display.secondary}</p>
        )}
        {ep.description?.trim() && !display.secondary && (
          <p className="text-[11px] leading-relaxed text-white/45 line-clamp-1">{ep.description}</p>
        )}
        {inProgress && (
          <p className="text-[10px] font-medium tabular-nums text-brand-magenta">
            {Math.round(pct)} % visionné
          </p>
        )}
        {isCompleted && (
          <p className="text-[10px] font-medium text-emerald-400/90">Terminé</p>
        )}
      </div>
    </>
  );

  if (!canWatch) {
    return (
      <article className={cardClass} aria-disabled>
        {inner}
      </article>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

export function SeasonEpisodeList({
  contentId,
  contentTitle,
  seasons,
  canWatch,
  canDownload = false,
  watchHistory = [],
}: SeasonEpisodeListProps) {
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id ?? "");
  const { download: startDownload } = useDownloadContent();

  const historyByEpisode = watchHistory.reduce<Record<string, WatchedEpisode>>((acc, h) => {
    if (h.episodeId) acc[h.episodeId] = h;
    return acc;
  }, {});

  useEffect(() => {
    if (!seasons.length) return;
    if (!seasons.some((s) => s.id === activeSeasonId)) {
      setActiveSeasonId(seasons[0].id);
    }
  }, [seasons, activeSeasonId]);

  const currentSeason = seasons.find((s) => s.id === activeSeasonId) ?? seasons[0];
  const episodes = currentSeason?.episodes ?? [];

  const { ref, edges, scroll } = useHorizontalScroll([episodes, activeSeasonId]);

  useEffect(() => {
    ref.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeSeasonId, ref]);

  if (!seasons.length) return null;

  return (
    <section className="min-w-0">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:max-w-md sm:flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="ivod-line-accent w-10 shrink-0" />
            <h2 className="text-lg font-bold tracking-tight text-white">Épisodes</h2>
          </div>
          <IvodSelect
            id="season-select"
            label="Saison"
            value={activeSeasonId}
            onChange={setActiveSeasonId}
            className="w-full sm:min-w-[260px]"
            options={seasons.map((s) => ({
              value: s.id,
              label: seasonSelectLabel(s),
            }))}
          />
        </div>
        {episodes.length > 0 && <ScrollRowArrows edges={edges} onScroll={scroll} />}
      </div>

      {episodes.length === 0 ? (
        <p className="py-6 text-sm text-white/45">Aucun épisode disponible pour cette saison.</p>
      ) : (
        <ScrollRow
          sideControls
          scrollRef={ref}
          edges={edges}
          onScroll={scroll}
          scrollClassName={EPISODE_ROW_SCROLL}
        >
          {episodes.map((ep) => (
            <EpisodeCard
              key={ep.id}
              ep={ep}
              contentId={contentId}
              canWatch={canWatch}
              canDownload={canDownload}
              watched={historyByEpisode[ep.id]}
              onDownload={(episodeId) => {
                const epMeta = episodes.find((e) => e.id === episodeId);
                startDownload({
                  contentId,
                  episodeId,
                  title: `${contentTitle ?? "Série"} · Ép. ${epMeta?.episodeNumber ?? ""}`,
                  posterUrl: episodeThumbnailUrl(epMeta?.thumbnailObjectKey),
                });
              }}
            />
          ))}
        </ScrollRow>
      )}
    </section>
  );
}
