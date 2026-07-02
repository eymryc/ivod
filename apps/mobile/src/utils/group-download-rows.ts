/** Regroupe les téléchargements d'épisodes d'une même série (2+ épisodes). */

export type GroupedDownloadItem<T> =
  | { kind: "single"; item: T }
  | { kind: "series"; contentId: string; items: T[] };

export type GroupDownloadRowsOptions<T> = {
  getContentId: (item: T) => string;
  getEpisodeId: (item: T) => string | null | undefined;
  compareEpisodes?: (a: T, b: T) => number;
  minEpisodesToGroup?: number;
};

export function groupDownloadRows<T>(
  rows: T[],
  options: GroupDownloadRowsOptions<T>,
): GroupedDownloadItem<T>[] {
  const {
    getContentId,
    getEpisodeId,
    compareEpisodes,
    minEpisodesToGroup = 2,
  } = options;

  const episodeCountByContent = new Map<string, number>();
  for (const row of rows) {
    const epId = getEpisodeId(row);
    if (!epId) continue;
    const cid = getContentId(row);
    episodeCountByContent.set(cid, (episodeCountByContent.get(cid) ?? 0) + 1);
  }

  const seriesGroupIds = new Set<string>();
  for (const [cid, count] of episodeCountByContent) {
    if (count >= minEpisodesToGroup) seriesGroupIds.add(cid);
  }

  const seriesItems = new Map<string, T[]>();
  for (const row of rows) {
    const cid = getContentId(row);
    const epId = getEpisodeId(row);
    if (!epId || !seriesGroupIds.has(cid)) continue;
    const bucket = seriesItems.get(cid) ?? [];
    bucket.push(row);
    seriesItems.set(cid, bucket);
  }

  if (compareEpisodes) {
    for (const items of seriesItems.values()) {
      items.sort(compareEpisodes);
    }
  }

  const emitted = new Set<string>();
  const result: GroupedDownloadItem<T>[] = [];

  for (const row of rows) {
    const cid = getContentId(row);
    const epId = getEpisodeId(row);

    if (epId && seriesGroupIds.has(cid)) {
      if (!emitted.has(cid)) {
        emitted.add(cid);
        result.push({
          kind: "series",
          contentId: cid,
          items: seriesItems.get(cid) ?? [],
        });
      }
      continue;
    }

    result.push({ kind: "single", item: row });
  }

  return result;
}

export function compareEpisodeDownloads<
  T extends {
    episode?: { seasonNumber?: number; episodeNumber?: number };
  },
>(a: T, b: T): number {
  const sa = a.episode?.seasonNumber ?? 0;
  const sb = b.episode?.seasonNumber ?? 0;
  if (sa !== sb) return sa - sb;
  return (a.episode?.episodeNumber ?? 0) - (b.episode?.episodeNumber ?? 0);
}
