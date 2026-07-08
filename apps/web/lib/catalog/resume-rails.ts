export type RailHistoryItem = {
  id?: string;
  contentId?: string;
  episodeId?: string | null;
  percentage?: number;
  completed?: boolean;
  watchedSeconds?: number;
  lastWatchedAt?: string;
  content?: { id?: string; title?: string; contentType?: string | { code?: string } };
  episode?: { seasonNumber?: number; episodeNumber?: number } | null;
};

function isSeriesItem(item: RailHistoryItem): boolean {
  const ct = item.content?.contentType;
  if (typeof ct === "string") {
    return ct === "SERIES" || ct === "WEB_SERIES";
  }
  const code = ct?.code;
  return code === "SERIES" || code === "WEB_SERIES";
}

/** Reprise récente (dernières 24 h) — rail « Reprends ce soir ». */
export function filterResumeTonight(items: RailHistoryItem[]): RailHistoryItem[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return items.filter((h) => {
    if (h.completed || (h.percentage ?? 0) < 3 || (h.percentage ?? 0) >= 92) return false;
    const at = h.lastWatchedAt ? new Date(h.lastWatchedAt).getTime() : 0;
    return at >= cutoff;
  });
}

/** Séries avec épisode en cours non terminé. */
export function filterUnfinishedSeries(items: RailHistoryItem[]): RailHistoryItem[] {
  return items.filter(
    (h) =>
      !h.completed &&
      !!h.episodeId &&
      isSeriesItem(h) &&
      (h.percentage ?? 0) >= 5 &&
      (h.percentage ?? 0) < 90,
  );
}
