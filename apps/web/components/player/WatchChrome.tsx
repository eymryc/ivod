"use client";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Lock, Clock, Sparkles, Shield } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";

/** Plein écran — fond noir, sans letterbox ni cadre */
export function WatchBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch-cinema-root fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-white">
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Zone vidéo — occupe tout l'espace ; `group/watch` pour le chrome au survol */
export function WatchStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch-stage group/watch relative min-h-0 flex-1 w-full">{children}</div>
  );
}

/** Retour (et badge optionnel) visibles uniquement au survol de la zone vidéo */
export function WatchHoverBack({
  onBack,
  badge,
}: {
  onBack: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 px-3 py-3 opacity-100 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/watch:opacity-100 sm:px-4 sm:py-4">
      <button
        type="button"
        onClick={onBack}
        className="ivod-btn pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 bg-black/55 text-white/90 backdrop-blur-sm transition-colors hover:border-brand-magenta/40 hover:bg-black/70 hover:text-white"
        aria-label="Retour"
      >
        <ArrowLeft size={18} />
      </button>
      {badge ? <div className="pointer-events-auto pt-1.5">{badge}</div> : null}
    </div>
  );
}

export function WatchPreviewBadge() {
  return (
    <span className="inline-flex items-center gap-1 border border-brand-magenta/30 bg-brand-magenta/15 px-2.5 py-0.5 text-[10px] font-semibold text-brand-magenta">
      <Sparkles size={10} />
      Aperçu studio
    </span>
  );
}

export function WatchModerationBadge() {
  return (
    <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
      <Shield size={10} className="opacity-90" />
      Modération
    </span>
  );
}

export function WatchStatePanel({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <WatchBackdrop>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center">{icon}</div>
        <div className="max-w-md space-y-2">
          {title ? (
            <p className="font-display text-xl font-semibold tracking-wide text-white">{title}</p>
          ) : null}
          {description ? <p className="text-sm leading-relaxed text-readable-dim">{description}</p> : null}
        </div>
        {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </WatchBackdrop>
  );
}

export function WatchLoading() {
  return (
    <WatchBackdrop>
      <BrandLoader
        fullScreen={false}
        size="lg"
        tagline="Préparation de la lecture"
        className="min-h-0 flex-1 py-0"
      />
    </WatchBackdrop>
  );
}

export { AlertCircle, Lock, Clock, Loader2 };
export { default as Link } from "next/link";
