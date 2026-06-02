/**
 * Entités du domaine Watch (session de visionnage & reprise).
 *
 * Contient toute la logique métier de reprise et de gestion des sessions
 * sans aucune dépendance à React ou à l'infrastructure.
 */

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
  if (resume?.episodeId) return `/watch/${contentId}?episodeId=${resume.episodeId}`;
  return `/watch/${contentId}`;
}
