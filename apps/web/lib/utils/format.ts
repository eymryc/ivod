import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Durée catalogue : priorité champ content, sinon durée détectée sur l’asset vidéo */
export function resolveDurationSeconds(
  contentDuration?: number | null,
  videoDurationSec?: number | null,
): number | null {
  if (contentDuration != null && contentDuration > 0) return contentDuration;
  if (videoDurationSec != null && videoDurationSec > 0) return videoDurationSec;
  return null;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatDate(date: string | Date, pattern = "dd MMM yyyy"): string {
  return format(new Date(date), pattern, { locale: fr });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export function formatProgress(watchedSeconds: number, totalSeconds: number): number {
  if (!totalSeconds) return 0;
  return Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100));
}
