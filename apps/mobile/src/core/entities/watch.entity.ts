/**
 * Entités du domaine Watch (session de visionnage & reprise).
 *
 * Contient toute la logique métier de reprise et de gestion des sessions
 * sans aucune dépendance à React ou à l'infrastructure.
 */

import type { ResumePreview } from './resume-preview.entity';
import { formatDuration } from '@/core/utils/format-duration';
import { estimateResumeDataMb } from '@/core/utils/resume-data-estimate';

export type { ResumePreview } from './resume-preview.entity';

// ─── Session ───────────────────────────────────────────────────────────────

/** Résultat de POST /watch-sessions — identifiant + position de reprise. */
export interface WatchSession {
  id: string;
  /** Position en secondes depuis laquelle l'utilisateur peut reprendre. */
  resumePositionSec?: number;
}

// ─── Historique ────────────────────────────────────────────────────────────

/** Entrée d'historique de visionnage pour un contenu ou un épisode. */
export interface WatchHistoryEntry {
  id: string;
  contentId: string;
  /** Défini si l'historique correspond à un épisode. */
  episodeId?: string | null;
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
  lastWatchedAt?: string;
  resumePreview?: ResumePreview | null;
  episode?: {
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  } | null;
}

// ─── Reprise ───────────────────────────────────────────────────────────────

/**
 * Détermine si une entrée d'historique justifie un bouton "Continuer".
 *
 * Règles métier :
 * - Pas de reprise si le contenu est marqué terminé.
 * - Pas de reprise si la progression dépasse 92 % (considéré comme terminé).
 * - Reprise si progression >= 1 % ou si > 15 secondes visionnées.
 */
export function canResumeSession(entry: WatchHistoryEntry | null | undefined): boolean {
  if (!entry || entry.completed) return false;
  const pct = entry.percentage ?? 0;
  if (pct >= 92) return false;
  if (pct >= 1) return true;
  return (entry.watchedSeconds ?? 0) > 15;
}

/**
 * Résout la meilleure entrée de reprise pour un contenu donné.
 *
 * Privilégie l'historique de session (plus frais) sur la progression
 * stockée directement dans l'objet contenu.
 */
export function resolveResumeForContent(
  contentId: string,
  historyItems: WatchHistoryEntry[],
  userProgress?: {
    watchedSeconds?: number;
    percentage?: number;
    completed?: boolean;
    episodeId?: string | null;
  } | null,
): WatchHistoryEntry | null {
  // 1. Chercher dans l'historique récent de l'utilisateur
  const fromHistory = historyItems.find(
    (h) => h.contentId === contentId && canResumeSession(h),
  );
  if (fromHistory) return fromHistory;

  // 2. Fallback sur la progression stockée dans le contenu
  if (!userProgress || userProgress.completed) return null;
  if ((userProgress.percentage ?? 0) >= 92) return null;
  if ((userProgress.watchedSeconds ?? 0) > 15 || (userProgress.percentage ?? 0) >= 1) {
    return {
      id: `progress-${contentId}`,
      contentId,
      episodeId: userProgress.episodeId ?? null,
      watchedSeconds: userProgress.watchedSeconds,
      percentage: userProgress.percentage,
      completed: userProgress.completed,
    };
  }
  return null;
}

/**
 * Construit le href de navigation vers l'écran de lecture.
 *
 * Si une session de reprise contient un épisodeId, l'ajoute en query param
 * pour que le lecteur commence directement au bon épisode.
 */
export function buildWatchHref(
  contentId: string,
  resume?: WatchHistoryEntry | null,
): string {
  const params = new URLSearchParams();
  if (resume?.episodeId) params.set('episodeId', resume.episodeId);
  const t = Math.floor(resume?.watchedSeconds ?? 0);
  if (t > 5) params.set('t', String(t));
  const q = params.toString();
  return `/watch/${contentId}${q ? `?${q}` : ''}`;
}

/** Deep link natif ivod://watch/...?t= pour partage WhatsApp. */
export function buildResumeDeepLink(
  contentId: string,
  resume?: WatchHistoryEntry | null,
): string {
  const params = new URLSearchParams();
  if (resume?.episodeId) params.set('episodeId', resume.episodeId);
  const t = Math.floor(resume?.watchedSeconds ?? 0);
  if (t > 0) params.set('t', String(t));
  const q = params.toString();
  return `ivod://watch/${contentId}${q ? `?${q}` : ''}`;
}

export function buildResumeWebLink(
  contentId: string,
  resume?: WatchHistoryEntry | null,
): string {
  const params = new URLSearchParams();
  if (resume?.episodeId) params.set('episodeId', resume.episodeId);
  const t = Math.floor(resume?.watchedSeconds ?? 0);
  if (t > 0) params.set('t', String(t));
  const q = params.toString();
  // EXPO_PUBLIC_WEB_URL — même variable que core/config/payment.ts, définie
  // par profil dans eas.json. Avant ce correctif, ce domaine était en dur
  // ("ivod.africa", qui ne résout pas) — tout lien de partage était cassé.
  const base = (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/watch/${contentId}${q ? `?${q}` : ''}`;
}

/** Libellé enrichi : S2 É3 · 42 % · il reste 18 min · ~25 Mo */
export function formatResumeLabel(opts: {
  seasonNumber?: number;
  episodeNumber?: number;
  percentage?: number;
  durationSec?: number | null;
  watchedSeconds?: number;
  includeDataEstimate?: boolean;
}): string | null {
  const parts: string[] = [];
  if (opts.seasonNumber != null && opts.episodeNumber != null) {
    parts.push(`S${opts.seasonNumber} É${opts.episodeNumber}`);
  }
  if (opts.percentage != null && opts.percentage > 0) {
    parts.push(`${Math.round(opts.percentage)} %`);
  }
  const total = opts.durationSec ?? 0;
  const watched = opts.watchedSeconds ?? 0;
  const remaining = total > watched ? total - watched : 0;
  const remainingLabel = formatDuration(remaining);
  if (remainingLabel) parts.push(`il reste ${remainingLabel}`);
  if (opts.includeDataEstimate && remaining > 0) {
    const mb = estimateResumeDataMb(remaining);
    if (mb > 0) parts.push(`~${mb} Mo`);
  }
  return parts.length ? parts.join(' · ') : null;
}
