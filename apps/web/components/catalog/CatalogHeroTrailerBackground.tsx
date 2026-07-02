"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { promoApi } from "@/lib/api/promo";

type Props = {
  promoId: string;
  posterSrc: string | null;
};

function applySound(video: HTMLVideoElement, soundOn: boolean) {
  video.muted = !soundOn;
  video.volume = soundOn ? 1 : 0;
}

/** BA / teaser en boucle derrière le hero — son activable (clic requis si autoplay bloqué). */
export function CatalogHeroTrailerBackground({ promoId, posterSrc }: Props) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [autoplayBlockedSound, setAutoplayBlockedSound] = useState(false);

  const { data: stream } = useQuery({
    queryKey: ["catalog-hero-trailer", promoId],
    queryFn: () => promoApi.getStream(promoId),
    enabled: !reducedMotion,
    staleTime: 50 * 60_000,
    retry: 1,
  });

  const startPlayback = useCallback(async (withSound: boolean) => {
    const video = videoRef.current;
    if (!video) return false;
    applySound(video, withSound);
    try {
      await video.play();
      setAutoplayBlockedSound(false);
      return true;
    } catch {
      if (withSound) {
        applySound(video, false);
        try {
          await video.play();
          setAutoplayBlockedSound(true);
          setSoundOn(false);
          return true;
        } catch {
          setVideoReady(false);
          return false;
        }
      }
      setVideoReady(false);
      return false;
    }
  }, []);

  useEffect(() => {
    setVideoReady(false);
    setSoundOn(true);
    setAutoplayBlockedSound(false);
  }, [promoId, stream?.url]);

  useEffect(() => {
    if (!stream?.url || reducedMotion) return;
    void startPlayback(true);
  }, [stream?.url, reducedMotion, startPlayback]);

  const toggleSound = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !soundOn;
    setSoundOn(next);
    applySound(video, next);
    if (video.paused) {
      try {
        await video.play();
        setAutoplayBlockedSound(false);
      } catch {
        if (next) {
          setSoundOn(false);
          applySound(video, false);
        }
      }
    }
  }, [soundOn]);

  if (reducedMotion || !stream?.url) {
    return posterSrc ? (
      <MediaImage
        src={posterSrc}
        alt=""
        fill
        className="catalog-hero-backdrop catalog-hero-backdrop--main catalog-hero-trailer-media"
        priority
        sizes="100vw"
        fallbackClassName="absolute inset-0"
      />
    ) : (
      <div className="absolute inset-0 catalog-hero-backdrop-fallback" aria-hidden />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {posterSrc && (
        <MediaImage
          src={posterSrc}
          alt=""
          fill
          className={`catalog-hero-backdrop catalog-hero-backdrop--main catalog-hero-trailer-media transition-opacity duration-700 ${
            videoReady ? "opacity-0" : "opacity-100"
          }`}
          priority
          sizes="100vw"
          fallbackClassName="absolute inset-0"
        />
      )}
      <video
        ref={videoRef}
        src={stream.url}
        loop
        playsInline
        autoPlay
        preload="auto"
        className={`catalog-hero-trailer-media absolute inset-0 h-full w-full transition-opacity duration-700 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onPlaying={() => setVideoReady(true)}
      />
      {videoReady ? (
        <button
          type="button"
          onClick={() => void toggleSound()}
          className={`catalog-hero-sound-btn absolute top-20 right-4 md:top-24 md:right-8 z-20 flex h-10 w-10 items-center justify-center border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-black/65 ${
            autoplayBlockedSound && !soundOn ? "catalog-hero-sound-btn--pulse" : ""
          }`}
          aria-label={soundOn ? "Couper le son de la bande-annonce" : "Activer le son de la bande-annonce"}
          aria-pressed={soundOn}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      ) : null}
    </div>
  );
}
