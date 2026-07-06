import { CheckCircle2, Loader2, AlertCircle, Upload, Play, RotateCcw } from "lucide-react";

export type PipelineStatus =
  | "IDLE"
  | "UPLOADING"
  | "UPLOADED"
  | "PROBING"
  | "TRANSCODING"
  | "PACKAGING"
  | "READY_PREVIEW"
  | "READY"
  | "ERROR";

const STEPS: { status: PipelineStatus; label: string; pct: number }[] = [
  { status: "UPLOADED", label: "Upload", pct: 0 },
  { status: "PROBING", label: "Analyse", pct: 20 },
  { status: "TRANSCODING", label: "Transcodage", pct: 45 },
  { status: "READY_PREVIEW", label: "Preview", pct: 72 },
  { status: "PACKAGING", label: "Finalisation", pct: 85 },
  { status: "READY", label: "Prêt", pct: 100 },
];

const PCT_ORDER: Record<string, number> = {
  IDLE: -1,
  UPLOADING: 0,
  UPLOADED: 0,
  PROBING: 20,
  TRANSCODING: 45,
  PACKAGING: 55,
  READY_PREVIEW: 72,
  READY: 100,
  ERROR: -1,
};

/** Formate une durée en secondes en texte court ("47 min", "1h20"). */
function formatEta(etaSeconds: number): string {
  const minutes = Math.round(etaSeconds / 60);
  if (minutes < 1) return "moins d'une minute";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h${m > 0 ? m.toString().padStart(2, "0") : ""}`;
}

interface UploadProgressProps {
  status: PipelineStatus;
  uploadProgress?: number;
  errorMessage?: string | null;
  completedProfiles?: string[];
  remainingProfiles?: string[];
  /** Affichage compact (liste épisodes studio). */
  variant?: "default" | "compact";
  /** Ex. S01E03 — affiché dans l’en-tête en mode compact. */
  episodeLabel?: string;
  onRetry?: () => void;
  retryPending?: boolean;
  /** Débit mesuré + temps restant estimé, une fois qu'un envoi lent est détecté. */
  slowUploadInfo?: { throughputMbps: number; etaSeconds: number } | null;
  /** Nombre de connexions parallèles actives / max, si réduit par la concurrence adaptative. */
  concurrencyInfo?: { current: number; max: number } | null;
  /**
   * Une rendition (aperçu) est publiée et regardable — reste vrai même une
   * fois la qualité complète repassée en cours d'encodage (le statut brut
   * `status` redevient TRANSCODING à ce moment-là, ce qui masquait à tort
   * cette info avant le 2026-07-03).
   */
  previewAvailable?: boolean;
}

export function UploadProgress({
  status,
  uploadProgress = 0,
  errorMessage,
  completedProfiles = [],
  remainingProfiles = [],
  variant = "default",
  episodeLabel,
  onRetry,
  retryPending = false,
  slowUploadInfo,
  concurrencyInfo,
  previewAvailable = false,
}: UploadProgressProps) {
  const compact = variant === "compact";
  const isError = status === "ERROR";
  const isDone = status === "READY";
  const isPreview = status === "READY_PREVIEW";
  const isUploading = status === "UPLOADING";
  const showPersistentPreviewNotice = previewAvailable && !isDone && !isError && !isUploading && !isPreview;
  const currentPct = isUploading
    ? Math.round(uploadProgress * 0.3)
    : (PCT_ORDER[status] ?? 0);

  const title = isDone
    ? "Vidéo prête"
    : isPreview
      ? "Aperçu disponible"
      : isError
        ? "Échec du traitement"
        : isUploading
          ? "Envoi en cours…"
          : "Traitement en cours…";

  const Icon = isDone
    ? CheckCircle2
    : isPreview
      ? Play
      : isError
        ? AlertCircle
        : isUploading
          ? Upload
          : Loader2;

  const showProfiles =
    !isError &&
    !isDone &&
    !isUploading &&
    (completedProfiles.length > 0 || remainingProfiles.length > 0);

  return (
    <div
      className={`rounded-none border border-white/[0.06] bg-white/[0.01] ring-1 ring-primary/[0.06] overflow-hidden ${
        compact ? "ring-white/[0.04]" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-primary/10 bg-primary/[0.03] ${
          compact ? "px-3 py-2" : "px-5 py-3"
        }`}
      >
        <Icon
          size={compact ? 12 : 14}
          className={`shrink-0 ${
            isDone
              ? "text-emerald-400"
              : isPreview
                ? "text-secondary"
                : isError
                  ? "text-red-400"
                  : "text-primary/70"
          } ${!isDone && !isError && !isPreview ? "animate-spin" : ""}`}
          strokeWidth={1.5}
        />
        <span
          className={`uppercase tracking-[0.14em] text-primary/70 font-medium ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          Pipeline vidéo
        </span>
        {episodeLabel && (
          <span className="ml-auto font-mono text-[10px] text-white/40">{episodeLabel}</span>
        )}
      </div>

      <div className={`space-y-4 ${compact ? "p-3 sm:p-4" : "p-5 sm:p-6 space-y-5"}`}>
        <div>
          <p className={`font-medium text-white ${compact ? "text-[13px]" : "text-[15px]"}`}>
            {title}
          </p>
          {isUploading && (
            <p className="text-[12px] text-readable-dim font-light mt-1 tabular-nums">
              Transfert {uploadProgress}%
            </p>
          )}
          {isUploading && slowUploadInfo && (
            <p className="text-[11.5px] text-amber-400/80 font-light mt-1.5 tabular-nums">
              Débit mesuré : {slowUploadInfo.throughputMbps} Mbps — temps restant estimé :{" "}
              {formatEta(slowUploadInfo.etaSeconds)}
            </p>
          )}
          {isUploading && concurrencyInfo && concurrencyInfo.current < concurrencyInfo.max && (
            <p className="text-[11px] text-readable-muted font-light mt-1 tabular-nums">
              Connexions parallèles réduites automatiquement : {concurrencyInfo.current}/
              {concurrencyInfo.max} (réseau chargé)
            </p>
          )}
          {isPreview && (
            <p className="text-[12px] text-readable-dim font-light mt-1">
              Lecture possible — les autres qualités sont encore en cours d&apos;encodage
            </p>
          )}
          {!isUploading && !isDone && !isPreview && !isError && (
            <p className="text-[12px] text-readable-dim font-light mt-1">
              Encodage multi-qualités en cours sur nos serveurs
            </p>
          )}
          {showPersistentPreviewNotice && (
            <p className="text-[12px] text-emerald-400/90 font-light mt-1.5 flex items-center gap-1.5">
              <Play size={11} className="shrink-0" />
              Vous pouvez déjà regarder cette vidéo — la qualité complète finit en tâche de fond
            </p>
          )}
          {errorMessage && (
            <p className="text-[12px] text-red-400/90 mt-1">{errorMessage}</p>
          )}
          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryPending}
              className="mt-3 inline-flex items-center gap-1.5 rounded-none border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-200 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
            >
              {retryPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Relancer l&apos;encodage
            </button>
          )}
        </div>

        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDone
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : isPreview
                  ? "bg-gradient-to-r from-secondary to-primary/80"
                  : isError
                    ? "bg-red-500"
                    : "bg-gradient-to-r from-primary to-secondary/80"
            }`}
            style={{ width: `${Math.min(100, Math.max(2, currentPct))}%` }}
          />
        </div>

        {showProfiles && (
          <div className="rounded-none border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 space-y-2">
            {completedProfiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-readable-muted w-full sm:w-auto">
                  Terminé
                </span>
                {completedProfiles.map((p, i) => (
                  <span
                    key={`done-${p}-${i}`}
                    className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-emerald-500/15 text-emerald-400/95 border border-emerald-500/20"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            {remainingProfiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-readable-muted w-full sm:w-auto">
                  En cours
                </span>
                {remainingProfiles.map((p, i) => (
                  <span
                    key={`pending-${p}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-medium bg-primary/10 text-primary/90 border border-primary/20"
                  >
                    <Loader2 size={10} className="animate-spin shrink-0" />
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`flex justify-between gap-1 ${compact ? "hidden sm:flex" : ""}`}>
          {STEPS.map((step, i) => {
            const order = PCT_ORDER[status] ?? -1;
            const done = !isError && order >= step.pct;
            const active =
              !isError &&
              !isDone &&
              order >= step.pct &&
              (i === STEPS.length - 1 || order < STEPS[i + 1]?.pct);

            return (
              <div key={step.status} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    done ? "bg-primary shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "bg-white/20"
                  } ${active ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-[#0a0a0c]" : ""}`}
                />
                <span
                  className={`text-[10px] text-center truncate w-full ${
                    done ? "text-primary/90" : "text-readable-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
