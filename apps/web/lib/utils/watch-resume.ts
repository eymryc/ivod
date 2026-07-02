/** Session de reprise pour un contenu (historique profil) */
export type WatchHistoryEntry = {
  id: string;
  contentId: string;
  episodeId?: string | null;
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
  lastWatchedAt?: string;
};

export function canResumeSession(h: WatchHistoryEntry | null | undefined): boolean {
  if (!h || h.completed) return false;
  const pct = h.percentage ?? 0;
  if (pct >= 92) return false;
  if (pct >= 1) return true;
  return (h.watchedSeconds ?? 0) > 15;
}

export function toResumeEntry(
  contentId: string,
  source: {
    watchedSeconds?: number;
    percentage?: number;
    completed?: boolean;
    episodeId?: string | null;
    id?: string;
    lastWatchedAt?: string;
  },
): WatchHistoryEntry {
  return {
    id: source.id ?? `progress-${contentId}`,
    contentId,
    episodeId: source.episodeId ?? null,
    watchedSeconds: source.watchedSeconds,
    percentage: source.percentage,
    completed: source.completed,
    lastWatchedAt: source.lastWatchedAt,
  };
}

/** Historique profil prioritaire, sinon progression renvoyée par GET /contents/:id */
export function resolveResumeForContent(
  contentId: string,
  historyItems: WatchHistoryEntry[],
  userProgress?: {
    watchedSeconds?: number;
    percentage?: number;
    completed?: boolean;
    lastWatchedAt?: string | Date;
  } | null,
): WatchHistoryEntry | null {
  const fromHistory = pickResumeSession(historyItems, contentId);
  if (fromHistory) return fromHistory;
  if (!userProgress) return null;
  const entry = toResumeEntry(contentId, {
    ...userProgress,
    lastWatchedAt:
      userProgress.lastWatchedAt instanceof Date
        ? userProgress.lastWatchedAt.toISOString()
        : userProgress.lastWatchedAt,
  });
  return canResumeSession(entry) ? entry : null;
}

export function pickResumeSession(
  items: WatchHistoryEntry[],
  contentId: string,
): WatchHistoryEntry | null {
  const candidates = items.filter(
    (h) => h.contentId === contentId && canResumeSession(h),
  );
  if (!candidates.length) return null;
  return candidates.sort(
    (a, b) =>
      new Date(b.lastWatchedAt ?? 0).getTime() -
      new Date(a.lastWatchedAt ?? 0).getTime(),
  )[0];
}

export function buildResumeWatchHref(
  contentId: string,
  episodeId?: string | null,
): string {
  return episodeId ? `/watch/${contentId}?ep=${episodeId}` : `/watch/${contentId}`;
}
