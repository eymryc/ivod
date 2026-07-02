export type WatchHistoryEntry = {
  id: string;
  contentId: string;
  episodeId?: string | null;
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
};

export function canResumeSession(h: WatchHistoryEntry | null | undefined): boolean {
  if (!h || h.completed) return false;
  const pct = h.percentage ?? 0;
  if (pct >= 92) return false;
  if (pct >= 1) return true;
  return (h.watchedSeconds ?? 0) > 15;
}

export function resolveResumeForContent(
  contentId: string,
  historyItems: WatchHistoryEntry[],
  userProgress?: { watchedSeconds?: number; percentage?: number; completed?: boolean; episodeId?: string | null } | null,
): WatchHistoryEntry | null {
  const fromHistory = historyItems.find((h) => h.contentId === contentId && canResumeSession(h));
  if (fromHistory) return fromHistory;
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

export function buildWatchHref(contentId: string, resume?: WatchHistoryEntry | null): string {
  if (resume?.episodeId) return `/watch/${contentId}?episodeId=${resume.episodeId}`;
  return `/watch/${contentId}`;
}
