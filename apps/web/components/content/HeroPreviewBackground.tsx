"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { videosApi } from "@/lib/api/videos";
import { MediaImage } from "@/components/ui/MediaImage";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

function playbackSrc(base: string, playbackToken?: string): string {
  if (!playbackToken) return base;
  if (base.includes("token=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(playbackToken)}`;
}

function mimeFor(format?: string, src?: string): string {
  if (format === "MP4") return "video/mp4";
  if (format === "HLS" || src?.includes(".m3u8") || src?.includes("/media?")) {
    return "application/x-mpegURL";
  }
  return "video/mp4";
}

/** Durée max de l’aperçu auto (style Netflix), puis retour au poster */
const HERO_PREVIEW_MAX_MS = 10_000;

type Props = {
  contentId: string;
  episodeId?: string | null;
  posterSrc: string | null;
  enabled: boolean;
  maxPreviewMs?: number;
  /** Reprise — démarre l’aperçu à cette position (secondes). */
  startPositionSec?: number;
};

/** Aperçu muet auto derrière le hero fiche — s’arrête après quelques secondes */
export function HeroPreviewBackground({
  contentId,
  episodeId,
  posterSrc,
  enabled,
  maxPreviewMs = HERO_PREVIEW_MAX_MS,
  startPositionSec,
}: Props) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);

  const active = enabled && !reducedMotion;

  const { data: stream } = useQuery({
    queryKey: ["hero-preview", contentId, episodeId ?? ""],
    queryFn: () =>
      episodeId
        ? videosApi.getEpisodeStreamUrl(episodeId)
        : videosApi.getStreamUrl(contentId),
    enabled: active,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    setPreviewEnded(false);
    setVideoReady(false);
  }, [active, stream?.url, episodeId]);

  useEffect(() => {
    if (!active || previewEnded || !stream?.url || !containerRef.current) return;

    const el = document.createElement("video-js");
    el.classList.add("vjs-big-play-centered", "hero-preview-vjs");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(el);

    const src = playbackSrc(stream.url, stream.playbackToken);
    const player = videojs(el, {
      autoplay: true,
      muted: true,
      loop: false,
      controls: false,
      fluid: false,
      fill: true,
      preload: "auto",
      playsinline: true,
      poster: posterSrc ?? undefined,
      sources: [{ src, type: mimeFor(stream.format, src) }],
    });

    playerRef.current = player;

    const stopPreview = () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.pause();
      }
      setVideoReady(false);
      setPreviewEnded(true);
    };

    const seekResume = () => {
      const pos = Math.floor(startPositionSec ?? 0);
      if (pos > 5 && player && !player.isDisposed()) {
        try {
          player.currentTime(pos);
        } catch {
          /* ignore */
        }
      }
    };

    const onPlaying = () => {
      setVideoReady(true);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(stopPreview, maxPreviewMs);
    };

    player.on("loadedmetadata", seekResume);
    player.on("playing", onPlaying);
    player.on("ended", stopPreview);

    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      setVideoReady(false);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
      }
      playerRef.current = null;
    };
  }, [
    active,
    previewEnded,
    stream?.url,
    stream?.format,
    stream?.playbackToken,
    posterSrc,
    maxPreviewMs,
    startPositionSec,
    episodeId,
  ]);

  if (!active) {
    return posterSrc ? (
      <MediaImage
        src={posterSrc}
        alt=""
        fill
        className="object-cover object-[center_20%]"
        priority
        sizes="100vw"
        fallbackClassName="absolute inset-0"
      />
    ) : (
      <div className="absolute inset-0 bg-background-elevated" />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {posterSrc && (
        <MediaImage
          src={posterSrc}
          alt=""
          fill
          className={`object-cover object-[center_20%] transition-opacity duration-700 ${
            videoReady ? "opacity-0" : "opacity-100"
          }`}
          priority
          sizes="100vw"
          fallbackClassName="absolute inset-0"
        />
      )}
      {!previewEnded && (
        <div
          ref={containerRef}
          className={`absolute inset-0 transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        />
      )}
    </div>
  );
}
