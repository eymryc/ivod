"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "./cinema-player.css";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { CinemaPlayerToolbar } from "./CinemaPlayerToolbar";
import { StoryboardPreview } from "./StoryboardPreview";
import { useStoryboard } from "@/lib/hooks/useStoryboard";
import { assetUrl } from "@/lib/utils/assets";

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  objectKey: string;
  src?: string;
}

// Only append a dedicated playback token — never the main user JWT (would log in MinIO/CDN access logs).
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

interface CinemaPlayerProps {
  src: string;
  format?: string;
  playbackToken?: string;
  durationSec?: number | null;
  startPosition?: number;
  subtitleTracks?: SubtitleTrack[];
  onTimeUpdate?: (currentTime: number) => void;
  onQualityChange?: (quality: string) => void;
  onQoE?: (event: {
    eventType: "startup" | "rebuffer" | "quality_change" | "error";
    payload?: Record<string, unknown>;
  }) => void;
  storyboardSpriteUrl?: string | null;
  storyboardVttUrl?: string | null;
  onEnded?: () => void;
  onError?: () => void;
  autoPlay?: boolean;
  /** UI type cinéma : vignette, contrôles auto-masqués, barre premium */
  cinemaMode?: boolean;
  /** Désactive grain / vignette forte pour une image plus nette */
  sharpVideo?: boolean;
  /** Filigrane iVOD discret en haut à gauche */
  showBrandMark?: boolean;
  /** Remplit l'écran (cover) au lieu de letterbox (contain) */
  edgeToEdge?: boolean;
  /** Qualité HLS initiale (auto, 720p, 1080p…) */
  initialQuality?: string;
  onCinemaIdleChange?: (idle: boolean) => void;
}

const QUALITIES = ["auto", "1080p", "720p", "480p", "360p"];
const IDLE_MS = 3200;

function ensureAudio(player: ReturnType<typeof videojs> | null) {
  if (!player || player.isDisposed()) return;
  try {
    player.muted(false);
    if ((player.volume() ?? 0) < 0.05) player.volume(1);
  } catch {
    /* ignore */
  }
}

export function CinemaPlayer({
  src,
  format,
  playbackToken,
  durationSec,
  startPosition = 0,
  subtitleTracks = [],
  onTimeUpdate,
  onQualityChange,
  onQoE,
  storyboardSpriteUrl,
  storyboardVttUrl,
  onEnded,
  onError,
  autoPlay = true,
  cinemaMode = true,
  sharpVideo = true,
  showBrandMark = true,
  edgeToEdge = false,
  initialQuality = "auto",
  onCinemaIdleChange,
}: CinemaPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupSentRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const playAttemptedRef = useRef(autoPlay);

  const [currentQuality, setCurrentQuality] = useState("auto");
  const [currentSubtitleId, setCurrentSubtitleId] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isPaused, setIsPaused] = useState(!autoPlay);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [skipFlash, setSkipFlash] = useState<"left" | "right" | null>(null);
  const [scrub, setScrub] = useState<{ x: number; time: number; width: number } | null>(null);

  const { getFrameAt, ready: storyboardReady } = useStoryboard(storyboardVttUrl);

  // Video.js peut déclencher des AbortError (fetch interrompu) quand on dispose le player.
  // En dev, Next log parfois ça comme unhandledRejection. On l’ignore explicitement.
  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const r: any = (e as any)?.reason;
      const name = r?.name ?? "";
      const msg = String(r?.message ?? r ?? "");
      if (name === "AbortError" || msg.includes("fetching process for the media resource was aborted")) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current) onTimeUpdate?.(playerRef.current.currentTime() ?? 0);
  }, [onTimeUpdate]);

  const wakeControls = useCallback(() => {
    setIsIdle(false);
    onCinemaIdleChange?.(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const p = playerRef.current;
    if (p && !p.isDisposed() && !p.paused() && cinemaMode) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        onCinemaIdleChange?.(true);
      }, IDLE_MS);
    }
  }, [cinemaMode, onCinemaIdleChange]);

  const flashSkip = useCallback((side: "left" | "right") => {
    setSkipFlash(side);
    setTimeout(() => setSkipFlash(null), 600);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || p.isDisposed()) return;
    if (p.paused()) {
      ensureAudio(p);
      playAttemptedRef.current = true;
      setNeedsUserPlay(false);
      void p.play();
      setIsPaused(false);
    } else {
      p.pause();
      setIsPaused(true);
      setIsBuffering(false);
      setIsIdle(false);
      onCinemaIdleChange?.(false);
    }
    wakeControls();
  }, [wakeControls, onCinemaIdleChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const p = playerRef.current;
      if (!p || p.isDisposed()) return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      wakeControls();

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          p.currentTime(Math.min((p.currentTime() ?? 0) + 10, p.duration() ?? 0));
          flashSkip("right");
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          p.currentTime(Math.max((p.currentTime() ?? 0) - 10, 0));
          flashSkip("left");
          break;
        case "ArrowUp":
          e.preventDefault();
          p.volume(Math.min((p.volume() ?? 0) + 0.1, 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          p.volume(Math.max((p.volume() ?? 0) - 0.1, 0));
          break;
        case "m":
        case "M":
          e.preventDefault();
          p.muted(!p.muted());
          break;
        case "f":
        case "F":
          e.preventDefault();
          if (p.isFullscreen()) p.exitFullscreen();
          else p.requestFullscreen();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, wakeControls, flashSkip]);

  const handleQualityChange = useCallback(
    (quality: string) => {
      setCurrentQuality(quality);
      onQualityChange?.(quality);
      onQoE?.({ eventType: "quality_change", payload: { quality } });
      if (playerRef.current) {
        const tech = (playerRef.current as any).tech({ IWillNotUseThisInPlugins: true });
        if (tech?.vhs?.representations) {
          const reps = tech.vhs.representations();
          reps.forEach((rep: any) => {
            if (quality === "auto") rep.enabled(true);
            else rep.enabled((rep.height ?? 0) === parseInt(quality, 10));
          });
        }
      }
      wakeControls();
    },
    [onQualityChange, wakeControls],
  );

  const handleSubtitleChange = useCallback(
    (trackId: string | null) => {
      setCurrentSubtitleId(trackId);
      if (!playerRef.current) return;
      const textTracks = playerRef.current.textTracks() as any;
      for (let i = 0; i < textTracks.length; i++) textTracks[i].mode = "disabled";
      if (trackId) {
        const track = subtitleTracks.find((t) => t.id === trackId);
        if (track) {
          for (let i = 0; i < textTracks.length; i++) {
            if (textTracks[i].language === track.language) {
              textTracks[i].mode = "showing";
              break;
            }
          }
        }
      }
      wakeControls();
    },
    [subtitleTracks, wakeControls],
  );

  useEffect(() => {
    setPipSupported("pictureInPictureEnabled" in document);
  }, []);

  const togglePip = useCallback(async () => {
    const videoEl = videoElRef.current;
    if (!videoEl) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await videoEl.requestPictureInPicture();
        setIsPip(true);
      }
      wakeControls();
    } catch {
      /* ignore */
    }
  }, [wakeControls]);

  useEffect(() => {
    if (!containerRef.current) return;

    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered w-full h-full";
    videoEl.setAttribute("playsinline", "");
    containerRef.current.appendChild(videoEl);
    videoElRef.current = videoEl;

    const resolvedSrc = playbackSrc(src, playbackToken);
    const player = videojs(videoEl, {
      sources: [{ src: resolvedSrc, type: mimeFor(format, resolvedSrc) }],
      fluid: false,
      fill: true,
      responsive: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      autoplay: autoPlay,
      controls: true,
      preload: "auto",
      inactivityTimeout: cinemaMode ? 0 : 2000,
      userActions: { hotkeys: false },
      html5: { vhs: { overrideNative: true } },
    });

    playerRef.current = player;

    const tryAutoplay = () => {
      ensureAudio(player);
      if (!autoPlay) {
        setIsPaused(true);
        return;
      }
      const attempt = player.play();
      if (attempt && typeof (attempt as Promise<void>).catch === "function") {
        (attempt as Promise<void>).catch(() => {
          setIsPaused(true);
          setNeedsUserPlay(true);
        });
      }
    };

    const applyKnownDuration = () => {
      if (!durationSec || durationSec < 1) return;
      const d = player.duration();
      if (!d || !Number.isFinite(d) || d < 1) {
        try {
          (player as ReturnType<typeof videojs> & { duration: (n: number) => void }).duration(
            durationSec,
          );
        } catch {
          /* ignore */
        }
      }
    };

    player.ready(() => {
      playAttemptedRef.current = autoPlay;

      if (startPosition > 0) {
        player.one("loadedmetadata", () => {
          player.currentTime(startPosition);
          applyKnownDuration();
          tryAutoplay();
        });
      } else {
        player.one("loadedmetadata", () => {
          applyKnownDuration();
          tryAutoplay();
        });
      }
      player.on("durationchange", applyKnownDuration);

      subtitleTracks.forEach((track) => {
        const url = track.src ?? assetUrl(track.objectKey, "ivod-videos");
        if (url) {
          try {
            const el = document.createElement("track");
            el.kind = "subtitles";
            el.label = track.label;
            el.srclang = track.language;
            el.src = url;
            videoEl.appendChild(el);
          } catch {
            /* ignore */
          }
        }
      });

      player.on("timeupdate", handleTimeUpdate);
      player.on("ended", () => onEnded?.());
      player.on("error", () => {
        setIsBuffering(false);
        onQoE?.({ eventType: "error" });
        onError?.();
      });
      player.on("waiting", () => {
        if (!playAttemptedRef.current) return;
        setIsBuffering(true);
        if (wasPlayingRef.current) {
          onQoE?.({ eventType: "rebuffer", payload: { at: player.currentTime() ?? 0 } });
        }
      });
      player.on("playing", () => {
        ensureAudio(player);
        setIsBuffering(false);
        setIsPaused(false);
        wasPlayingRef.current = true;
        playAttemptedRef.current = true;
        if (!startupSentRef.current) {
          startupSentRef.current = true;
          onQoE?.({
            eventType: "startup",
            payload: { ms: Math.round(performance.now()) },
          });
        }
        wakeControls();
      });
      player.on("canplay", () => setIsBuffering(false));
      player.on("pause", () => {
        setIsPaused(true);
        setIsBuffering(false);
        setIsIdle(false);
        onCinemaIdleChange?.(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      });
      player.on("play", () => setIsPaused(false));

      if (initialQuality && initialQuality !== "auto") {
        player.one("loadedmetadata", () => {
          const tech = (player as any).tech({ IWillNotUseThisInPlugins: true });
          if (tech?.vhs?.representations) {
            const height = parseInt(initialQuality, 10);
            tech.vhs.representations().forEach((rep: any) => {
              rep.enabled((rep.height ?? 0) === height);
            });
            setCurrentQuality(initialQuality);
          }
        });
      }

      videoEl.addEventListener("enterpictureinpicture", () => setIsPip(true));
      videoEl.addEventListener("leavepictureinpicture", () => setIsPip(false));
    });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
        videoElRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init player une fois par source
  }, [src, format, playbackToken, durationSec, startPosition, cinemaMode, autoPlay]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onMove = () => wakeControls();
    root.addEventListener("mousemove", onMove);
    root.addEventListener("touchstart", onMove, { passive: true });
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("touchstart", onMove);
    };
  }, [wakeControls]);

  // Storyboard scrub — prévisualisation au survol de la barre de progression.
  useEffect(() => {
    if (!storyboardReady || !cinemaMode || !storyboardSpriteUrl) return;
    const root = rootRef.current;
    if (!root) return;
    let control: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      if (!control) control = root.querySelector(".vjs-progress-control");
      if (!control) return;
      const rect = control.getBoundingClientRect();
      const within =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top - 18 &&
        e.clientY <= rect.bottom + 10;
      if (!within) {
        setScrub(null);
        return;
      }
      const dur = playerRef.current?.duration() ?? durationSec ?? 0;
      if (!dur || !Number.isFinite(dur)) {
        setScrub(null);
        return;
      }
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const rootRect = root.getBoundingClientRect();
      setScrub({ x: e.clientX - rootRect.left, time: ratio * dur, width: rootRect.width });
    };
    const onLeave = () => setScrub(null);

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [storyboardReady, cinemaMode, storyboardSpriteUrl, durationSec]);

  // Le dimensionnement (relative/h-full/w-full/bg-black) est appliqué via Tailwind — donc
  // par la feuille de styles racine toujours chargée — et non par cinema-player.css qui,
  // importé dans ce composant `dynamic({ ssr:false })`, arrive dans un chunk CSS asynchrone.
  // Sans cela, si video.js mesure la mise en page avant que cinema-player.css soit appliqué,
  // le conteneur s'effondre à 0px : le lecteur devient invisible alors que l'audio joue.
  const cinemaClass = cinemaMode
    ? `ivod-cinema relative h-full w-full bg-black${sharpVideo ? " ivod-cinema--sharp" : ""}${edgeToEdge ? " ivod-cinema--edge" : ""}${isIdle ? " ivod-cinema--idle" : ""}${isPaused ? " ivod-cinema--paused" : ""}`
    : "relative w-full h-full bg-black group";

  return (
    <div
      ref={rootRef}
      className={cinemaClass}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest(".ivod-cinema-toolbar, .vjs-control-bar")) return;
        togglePlay();
      }}
    >
      {cinemaMode && (
        <>
          <div className="ivod-cinema-scrim-top" aria-hidden />
          <div className="ivod-cinema-scrim-bottom" aria-hidden />
          {showBrandMark && (
            <div className="ivod-cinema-brand" aria-hidden>
              <span>iVOD</span>
            </div>
          )}
        </>
      )}

      <div ref={containerRef} className="relative z-[1] h-full w-full" />

      {cinemaMode && (
        <>
          <div className="ivod-cinema-play-overlay">
            <button type="button" onClick={togglePlay} aria-label={isPaused ? "Lecture" : "Pause"}>
              {isPaused ? (
                <Play size={32} className="ml-1" fill="currentColor" />
              ) : (
                <Pause size={32} fill="currentColor" />
              )}
            </button>
            {needsUserPlay && isPaused && (
              <p className="pointer-events-none absolute bottom-[calc(50%-4.5rem)] left-1/2 w-[min(90vw,22rem)] -translate-x-1/2 text-center text-sm font-medium text-white/85 drop-shadow-md">
                Appuyez sur lecture pour démarrer avec le son
              </p>
            )}
          </div>

          {skipFlash === "left" && (
            <div className="ivod-cinema-skip-flash ivod-cinema-skip-flash--left">
              <RotateCcw size={18} className="mr-2 inline" />
              −10 s
            </div>
          )}
          {skipFlash === "right" && (
            <div className="ivod-cinema-skip-flash ivod-cinema-skip-flash--right">
              +10 s
              <RotateCw size={18} className="ml-2 inline" />
            </div>
          )}

          {!isIdle && (
            <p className="ivod-cinema-hint">
              Espace lecture · J/L ±10 s · F plein écran
            </p>
          )}

          <CinemaPlayerToolbar
            qualities={QUALITIES}
            currentQuality={currentQuality}
            onQualityChange={handleQualityChange}
            subtitleTracks={subtitleTracks}
            currentSubtitleId={currentSubtitleId}
            onSubtitleChange={handleSubtitleChange}
            pipSupported={pipSupported}
            isPip={isPip}
            onTogglePip={togglePip}
          />

          {scrub && storyboardSpriteUrl && (() => {
            const frame = getFrameAt(scrub.time);
            return frame ? (
              <StoryboardPreview
                spriteUrl={storyboardSpriteUrl}
                frame={frame}
                cursorX={scrub.x}
                containerWidth={scrub.width}
                time={scrub.time}
              />
            ) : null;
          })()}
        </>
      )}

      {isBuffering && (
        <div className={cinemaMode ? "ivod-cinema-buffering" : "absolute inset-0 z-10 flex items-center justify-center bg-black/40"}>
          {cinemaMode ? (
            <>
              <div className="ivod-cinema-buffering-ring" />
              <p className="text-caption font-medium text-white/50">
                Chargement…
              </p>
            </>
          ) : (
            <div className="bg-black/60 p-4 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin border-2 border-white/20 border-t-brand-magenta" />
            </div>
          )}
        </div>
      )}

      {!cinemaMode && (
        <div className="absolute bottom-14 right-3 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <CinemaPlayerToolbar
            qualities={QUALITIES}
            currentQuality={currentQuality}
            onQualityChange={handleQualityChange}
            subtitleTracks={subtitleTracks}
            currentSubtitleId={currentSubtitleId}
            onSubtitleChange={handleSubtitleChange}
            pipSupported={pipSupported}
            isPip={isPip}
            onTogglePip={togglePip}
          />
        </div>
      )}
    </div>
  );
}
