"use client";

import Link from "next/link";
import { AlertCircle, Loader2, Play, RotateCcw } from "lucide-react";
import type { PipelineStatus } from "@/components/studio/UploadProgress";
import { formatPipelineErrorMessage } from "@/lib/studio/pipeline-error-message";

const PCT: Record<PipelineStatus, number> = {
  IDLE: 0,
  UPLOADING: 8,
  UPLOADED: 12,
  PROBING: 22,
  TRANSCODING: 48,
  PACKAGING: 58,
  READY_PREVIEW: 78,
  READY: 100,
  ERROR: 0,
};

const LABEL: Record<PipelineStatus, string> = {
  IDLE: "",
  UPLOADING: "Envoi",
  UPLOADED: "Upload reçu",
  PROBING: "Analyse du fichier",
  TRANSCODING: "Encodage",
  PACKAGING: "Finalisation",
  READY_PREVIEW: "Aperçu disponible",
  READY: "Prêt",
  ERROR: "Échec",
};

function uniqueProfiles(profiles: string[]): string[] {
  return [...new Set(profiles.filter((p) => p.trim().length > 0))];
}

function barTone(status: PipelineStatus): string {
  if (status === "READY_PREVIEW") return "bg-gradient-to-r from-secondary to-primary/90";
  return "bg-gradient-to-r from-primary to-secondary/80";
}

interface EpisodePipelineProgressProps {
  status: PipelineStatus;
  uploadProgress?: number;
  errorMessage?: string | null;
  completedProfiles?: string[];
  remainingProfiles?: string[];
  className?: string;
  reuploadHref?: string;
  onRetry?: () => void;
  retryPending?: boolean;
}

/** Barre pipeline intégrée à une ligne d’épisode (liste studio). */
export function EpisodePipelineProgress({
  status,
  uploadProgress = 0,
  errorMessage,
  completedProfiles = [],
  remainingProfiles = [],
  className = "",
  reuploadHref,
  onRetry,
  retryPending = false,
}: EpisodePipelineProgressProps) {
  const isError = status === "ERROR";
  const isPreview = status === "READY_PREVIEW";
  const isUploading = status === "UPLOADING";
  const pct = isUploading
    ? Math.min(30, Math.round(uploadProgress * 0.3))
    : PCT[status] ?? 0;
  const label = isUploading ? `Envoi ${uploadProgress}%` : LABEL[status];
  const doneProfiles = uniqueProfiles(completedProfiles);
  const pendingProfiles = uniqueProfiles(remainingProfiles).filter((p) => !doneProfiles.includes(p));
  const showProfiles =
    !isError && !isUploading && (doneProfiles.length > 0 || pendingProfiles.length > 0);

  if (isError) {
    const humanError = formatPipelineErrorMessage(errorMessage);
    return (
      <div
        className={`rounded-none border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5 space-y-2.5 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-2 min-w-0">
          <AlertCircle size={14} className="shrink-0 text-red-400 mt-0.5" strokeWidth={2} />
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold text-red-300">Encodage interrompu</p>
            <p className="text-[10px] leading-snug text-red-400/85">{humanError}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryPending}
              className="inline-flex items-center gap-1.5 rounded-none border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/15 disabled:opacity-50"
            >
              {retryPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Relancer l&apos;encodage
            </button>
          ) : null}
          {reuploadHref ? (
            <Link
              href={reuploadHref}
              className="text-[11px] text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
            >
              Ré-uploader la vidéo
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-2 min-w-0">
        {isPreview ? (
          <Play size={12} className="shrink-0 text-secondary" strokeWidth={2} />
        ) : (
          <Loader2 size={12} className="shrink-0 animate-spin text-primary/70" strokeWidth={2} />
        )}
        <span
          className={`min-w-0 flex-1 truncate text-[11px] font-medium ${
            isPreview ? "text-secondary/90" : "text-white/55"
          }`}
        >
          {label}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-white/30">{pct}%</span>
      </div>

      <div className="h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barTone(status)}`}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>

      {showProfiles && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {doneProfiles.map((p, i) => (
            <span
              key={`done-${p}-${i}`}
              className="px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/15"
            >
              {p}
            </span>
          ))}
          {pendingProfiles.map((p, i) => (
            <span
              key={`pending-${p}-${i}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-primary/85 bg-primary/10 border border-primary/15"
            >
              <Loader2 size={8} className="animate-spin shrink-0" />
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
