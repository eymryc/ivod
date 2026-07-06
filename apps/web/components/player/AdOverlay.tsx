"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Volume2, VolumeX, ExternalLink, Sparkles } from "lucide-react";

export interface AdConfig {
  type: "video" | "image" | "branded";
  url?: string;
  link?: string;
  skipAfter?: number;
  message?: string;
  adId?: string;
}

interface AdOverlayProps {
  ad: AdConfig;
  onComplete: () => void;
}

const LOGO_SRC = "/logo/logo_sans_fond.png";

function AdBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`ad-overlay-badge ${className}`}>
      <Sparkles size={10} className="shrink-0 text-brand-gold" aria-hidden />
      Publicité
    </span>
  );
}

function SkipProgressRing({
  remaining,
  total,
  size = 40,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 1;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90 shrink-0"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ad-skip-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
      <defs>
        <linearGradient id="ad-skip-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-brand-purple)" />
          <stop offset="45%" stopColor="var(--color-brand-magenta)" />
          <stop offset="100%" stopColor="var(--color-brand-gold)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SkipButton({
  canSkip,
  remaining,
  skipAfter,
  onSkip,
}: {
  canSkip: boolean;
  remaining: number;
  skipAfter: number;
  onSkip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => canSkip && onSkip()}
      disabled={!canSkip}
      className={`ad-overlay-skip ${canSkip ? "ad-overlay-skip--ready" : ""}`}
    >
      {!canSkip && skipAfter > 0 && (
        <SkipProgressRing remaining={remaining} total={skipAfter} size={36} />
      )}
      <span className="ad-overlay-skip__label">
        {canSkip ? (
          <>
            <X size={15} strokeWidth={2.5} />
            Passer la pub
          </>
        ) : (
          <span className="tabular-nums">{remaining}s</span>
        )}
      </span>
    </button>
  );
}

function AdChrome({
  children,
  footer,
  topRight,
}: {
  children: ReactNode;
  footer: ReactNode;
  topRight?: ReactNode;
}) {
  return (
    <div className="ad-overlay-root absolute inset-0 z-30 flex flex-col bg-[#000308]">
      <div className="ad-overlay-vignette pointer-events-none absolute inset-0" aria-hidden />
      <div className="ad-overlay-topline pointer-events-none absolute left-0 right-0 top-0 h-[2px]" aria-hidden />

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-5">
        <AdBadge />
        {topRight}
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
        {children}
      </div>

      <div className="ad-overlay-footer relative z-10 shrink-0 px-4 pb-4 sm:px-6 sm:pb-5">
        {footer}
      </div>
    </div>
  );
}

function BrandedAd({
  message,
  onComplete,
  skipAfter = 5,
}: {
  message?: string;
  onComplete: () => void;
  skipAfter?: number;
}) {
  const [remaining, setRemaining] = useState(skipAfter);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(skipAfter);
    completedRef.current = false;
  }, [skipAfter]);

  useEffect(() => {
    if (skipAfter <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [skipAfter]);

  useEffect(() => {
    if (completedRef.current) return;
    const done = skipAfter <= 0 || remaining === 0;
    if (!done) return;
    completedRef.current = true;
    const t = window.setTimeout(onComplete, 0);
    return () => window.clearTimeout(t);
  }, [remaining, skipAfter, onComplete]);

  const progress =
    skipAfter > 0 ? Math.min(100, ((skipAfter - remaining) / skipAfter) * 100) : 100;

  return (
    <div className="ad-overlay-branded absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-8">
      <div className="ad-overlay-branded__bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="ad-overlay-branded__card-outer relative w-full max-w-md p-px">
        <div className="ad-overlay-branded__card relative flex flex-col items-center px-8 py-10 text-center sm:px-10 sm:py-12">
          <div className="w-16 ivod-line-accent mb-6 opacity-90" aria-hidden />

          <div className="relative mb-6">
            <span className="ad-overlay-branded__logo-glow pointer-events-none absolute inset-0" aria-hidden />
            <Image
              src={LOGO_SRC}
              alt="iVOD"
              width={160}
              height={64}
              className="relative z-10 h-12 w-auto sm:h-14"
              priority
            />
          </div>

          <p className="text-caption font-semibold text-brand-magenta mb-2">
            Avant la lecture
          </p>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl mb-3">
            Un instant de publicité
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/72">
            {message ??
              "La vidéo démarrera juste après ce message. Ce programme est gratuit grâce à la publicité."}
          </p>

          {skipAfter > 0 && (
            <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <SkipProgressRing remaining={remaining} total={skipAfter} size={44} />
                <p className="text-left text-sm text-white/80">
                  Lecture dans{" "}
                  <span className="font-bold tabular-nums text-brand-gold">{remaining}s</span>
                </p>
              </div>
              <div className="h-1 w-full overflow-hidden bg-white/[0.08]">
                <div
                  className="content-card-progress-bar h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/settings/subscription"
              className="ivod-btn ivod-btn-primary inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white"
            >
              Regarder sans pub
            </Link>
          </div>
        </div>
      </div>

      <AdBadge className="absolute bottom-5 right-5 z-10 sm:bottom-6 sm:right-8" />
    </div>
  );
}

function VideoAd({
  ad,
  onComplete,
  onFallback,
}: {
  ad: AdConfig;
  onComplete: () => void;
  onFallback: () => void;
}) {
  const skipAfter = ad.skipAfter ?? 5;
  const [remaining, setRemaining] = useState(skipAfter);
  const [canSkip, setCanSkip] = useState(skipAfter === 0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (skipAfter === 0) {
      setCanSkip(true);
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0) setCanSkip(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [skipAfter]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const learnMore =
    ad.link != null && ad.link !== "" ? (
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        className="ad-overlay-learn-more"
      >
        En savoir plus
        <ExternalLink size={12} className="opacity-70" />
      </a>
    ) : null;

  return (
    <AdChrome
      topRight={learnMore}
      footer={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            {ad.type === "video" && (
              <button
                type="button"
                onClick={toggleMute}
                className="ad-overlay-control"
                aria-label={muted ? "Activer le son" : "Couper le son"}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
            <p className="hidden text-[11px] text-white/45 sm:block">
              Cliquez sur la pub pour plus d&apos;infos
            </p>
          </div>
          <SkipButton
            canSkip={canSkip}
            remaining={remaining}
            skipAfter={skipAfter}
            onSkip={finish}
          />
        </div>
      }
    >
      <div className="ad-overlay-media-frame relative h-full w-full max-h-full max-w-6xl">
        {ad.type === "video" ? (
          <video
            ref={videoRef}
            src={ad.url}
            autoPlay
            muted={muted}
            playsInline
            className="h-full w-full cursor-pointer object-contain"
            onEnded={finish}
            onError={onFallback}
            onClick={() => ad.link && window.open(ad.link, "_blank")}
          />
        ) : (
          <img
            src={ad.url}
            alt="Publicité"
            className="mx-auto max-h-full max-w-full cursor-pointer object-contain"
            onError={onFallback}
            onClick={() => ad.link && window.open(ad.link, "_blank")}
          />
        )}
      </div>
    </AdChrome>
  );
}

export function AdOverlay({ ad, onComplete }: AdOverlayProps) {
  const [useBranded, setUseBranded] = useState(ad.type === "branded" || !ad.url);

  if (useBranded) {
    return (
      <BrandedAd message={ad.message} onComplete={onComplete} skipAfter={ad.skipAfter ?? 5} />
    );
  }

  return (
    <VideoAd
      ad={ad}
      onComplete={onComplete}
      onFallback={() => setUseBranded(true)}
    />
  );
}
