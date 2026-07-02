"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Loader2, Maximize2, Play, Volume2 } from "lucide-react";
import { videosApi } from "@/lib/api/videos";
import { contentsApi } from "@/lib/api/contents";
import { isVideoPlayable } from "@/lib/utils/video";
import { posterUrl } from "@/lib/utils/assets";
import { getApiErrorMessage } from "@/lib/api/feedback";
import { useUIStore } from "@/lib/stores/ui.store";
import { BrandLoaderMark } from "@/components/ui/BrandLoader";

const CinemaPlayer = dynamic(
  () => import("./VideoPlayer").then((m) => m.CinemaPlayer),
  { ssr: false, loading: () => <ViewerSkeleton /> },
);

function ViewerSkeleton() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black">
      <BrandLoaderMark size="sm" showBar={false} showTagline={false} />
    </div>
  );
}

interface ContentVideoViewerProps {
  contentId: string;
  episodeId?: string;
  videoStatus?: string | null;
  durationSec?: number | null;
  posterSrc?: string | null;
  variant?: "embed" | "fill";
  className?: string;
  showFullscreenLink?: boolean;
  autoPlay?: boolean;
  /** Charge directement VideoPlayer (studio / admin), sans écran « Lancer la lecture ». */
  immediate?: boolean;
  /** Force lecture (ex. modération admin quand manifest existe) */
  playable?: boolean;
}

export function ContentVideoViewer({
  contentId,
  episodeId,
  videoStatus,
  durationSec,
  posterSrc,
  variant = "embed",
  className = "",
  showFullscreenLink = true,
  autoPlay = false,
  immediate = false,
  playable: playableOverride,
}: ContentVideoViewerProps) {
  const [started, setStarted] = useState(autoPlay || immediate);
  const { dataSaver, preferredQuality } = useUIStore();
  const initialQuality = dataSaver ? "480p" : preferredQuality;

  const playable = playableOverride ?? isVideoPlayable(videoStatus);

  const { data: contentMeta } = useQuery({
    queryKey: ["content-poster", contentId],
    queryFn: () => contentsApi.getOne(contentId),
    enabled: playable && !posterSrc,
    staleTime: 10 * 60_000,
  });

  const poster = posterSrc ?? posterUrl(contentMeta as Parameters<typeof posterUrl>[0]);

  const { data: streamData, isLoading, error } = useQuery({
    queryKey: ["stream", contentId, episodeId],
    queryFn: () =>
      episodeId ? videosApi.getEpisodeStreamUrl(episodeId) : videosApi.getStreamUrl(contentId),
    enabled: playable && started,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const watchHref = episodeId
    ? `/watch/${contentId}?ep=${episodeId}`
    : `/watch/${contentId}`;

  if (!playable) {
    return (
      <div
        className={`flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-black/60 ${className}`}
      >
        <AlertCircle size={28} className="text-white/35" />
        <p className="text-sm text-readable-muted">Vidéo non disponible pour la lecture</p>
      </div>
    );
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className={`group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-[#0a0a10] shadow-lg ${className}`}
        aria-label="Lancer la lecture"
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 900px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a24] to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />

        <span className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-white/40 bg-black/55 text-white shadow-[0_0_40px_rgba(249,115,22,0.35)] transition-transform group-hover:scale-110 group-hover:border-primary/70">
          <Play size={36} className="ml-1.5 fill-white" strokeWidth={1.5} />
        </span>

        <span className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Lancer la lecture
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] text-white/60">
            <Volume2 size={12} />
            Son activé
          </span>
        </span>
      </button>
    );
  }

  if (isLoading) return <ViewerSkeleton />;

  if (error || !streamData?.url) {
    const msg = getApiErrorMessage(error) ?? "";
    return (
      <div
        className={`flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-black/80 p-6 ${className}`}
      >
        <AlertCircle size={24} className="text-red-400" />
        <p className="text-center text-sm text-readable-dim">{msg}</p>
        {showFullscreenLink && (
          <Link href={watchHref} className="text-sm text-primary hover:underline">
            Ouvrir le lecteur plein écran
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-black ${
        variant === "embed"
          ? "aspect-video rounded-xl border border-white/[0.08] shadow-2xl"
          : "h-full w-full"
      } ${className}`}
    >
      <CinemaPlayer
        src={streamData.url}
        format={streamData.format}
        playbackToken={streamData.playbackToken}
        durationSec={durationSec}
        autoPlay
        cinemaMode
        sharpVideo
        showBrandMark={false}
        initialQuality={initialQuality}
      />
      {showFullscreenLink && variant === "embed" && (
        <Link
          href={watchHref}
          className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white/90 transition-colors hover:border-primary/40 hover:text-white"
        >
          <Maximize2 size={14} />
          Plein écran
        </Link>
      )}
    </div>
  );
}
