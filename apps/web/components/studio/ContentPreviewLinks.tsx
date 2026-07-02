"use client";

import Link from "next/link";
import { Eye, Play, ExternalLink } from "lucide-react";
import { isVideoPlayable } from "@/lib/utils/video";

interface ContentPreviewLinksProps {
  contentId: string;
  videoStatus?: string | null;
  /** icons = liste · buttons = barre · stack = colonne (fiche studio) */
  variant?: "icons" | "buttons" | "stack";
  /** Réduit le contraste des boutons icônes (liste catalogue). */
  subtle?: boolean;
  episodeId?: string;
  /** Lecture au niveau contenu (désactivé pour séries : vidéos par épisode). */
  showPlayLink?: boolean;
  className?: string;
}

/**
 * Liens studio pour prévisualiser la fiche publique et lire la vidéo (comme en admin).
 */
export function ContentPreviewLinks({
  contentId,
  videoStatus,
  variant = "icons",
  subtle = false,
  episodeId,
  showPlayLink = true,
  className = "",
}: ContentPreviewLinksProps) {
  const playable = showPlayLink && isVideoPlayable(videoStatus);
  const watchHref = episodeId
    ? `/watch/${contentId}?ep=${episodeId}`
    : `/watch/${contentId}`;
  /** Fiche publique (publié) ; le studio utilise /studio/contents/:id pour l’édition */
  const ficheHref = `/content/${contentId}`;
  const studioHref = `/studio/contents/${contentId}`;

  const stackBtn =
    "inline-flex w-full items-center justify-center gap-2 rounded-none border px-3.5 py-2 text-[12px] transition-colors sm:justify-start";

  if (variant === "stack") {
    return (
      <>
        <Link
          href={ficheHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${stackBtn} border-white/[0.08] bg-white/[0.02] text-readable-dim hover:border-primary/25 hover:text-primary`}
        >
          <Eye size={14} className="shrink-0" />
          Fiche publique
          <ExternalLink size={12} className="shrink-0 opacity-50" />
        </Link>
        {showPlayLink &&
          (playable ? (
            <Link
              href={watchHref}
              className={`${stackBtn} border-emerald-500/25 bg-emerald-500/10 text-emerald-400/95 hover:bg-emerald-500/15`}
            >
              <Play size={14} className="shrink-0 fill-current" />
              {videoStatus === "READY_PREVIEW" ? "Lire l'aperçu" : "Lire la vidéo"}
            </Link>
          ) : (
            <span
              className={`${stackBtn} cursor-not-allowed border-white/[0.06] text-readable-muted`}
            >
              <Play size={14} className="shrink-0" />
              Vidéo indisponible
            </span>
          ))}
      </>
    );
  }

  if (variant === "icons") {
    const iconBtn = subtle
      ? "flex h-8 w-8 items-center justify-center border border-white/[0.08] bg-white/[0.02] text-white/45 transition-colors hover:border-white/[0.14] hover:text-white/85"
      : "ivod-btn p-2 border border-brand-purple/30 text-brand-purple/80 hover:text-brand-magenta hover:border-brand-magenta hover:bg-brand-magenta/10 transition-colors";

    return (
      <div className={`flex items-center gap-1 shrink-0 ${className}`}>
        <Link
          href={ficheHref}
          target="_blank"
          rel="noopener noreferrer"
          className={iconBtn}
          aria-label="Fiche publique"
          title="Fiche publique"
        >
          <Eye size={14} />
        </Link>
        {playable && (
          <Link
            href={watchHref}
            className={
              subtle
                ? "flex h-8 w-8 items-center justify-center border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80 transition-colors hover:border-emerald-400/35 hover:text-emerald-300"
                : "ivod-btn p-2 border border-brand-magenta/30 text-brand-magenta/80 hover:text-brand-gold hover:border-brand-gold hover:bg-brand-orange/10 transition-colors"
            }
            aria-label="Lire la vidéo"
            title="Lecteur vidéo"
          >
            <Play size={14} className={subtle ? "fill-current" : undefined} />
          </Link>
        )}
        <Link
          href={studioHref}
          className={iconBtn}
          aria-label="Éditer"
          title="Éditer"
        >
          <ExternalLink size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        href={ficheHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none border border-white/[0.08] bg-white/[0.02] text-[12px] text-readable-dim hover:text-primary hover:border-primary/25 transition-colors"
      >
        <Eye size={14} />
        Fiche publique
        <ExternalLink size={12} className="opacity-50" />
      </Link>
      {showPlayLink &&
        (playable ? (
          <Link
            href={watchHref}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none border border-emerald-500/25 bg-emerald-500/10 text-[12px] text-emerald-400/95 hover:bg-emerald-500/15 transition-colors"
          >
            <Play size={14} className="fill-current" />
            {videoStatus === "READY_PREVIEW" ? "Lire l'aperçu" : "Lire la vidéo"}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none border border-white/[0.06] text-[12px] text-readable-muted cursor-not-allowed">
            <Play size={14} />
            Vidéo indisponible
          </span>
        ))}
    </div>
  );
}
