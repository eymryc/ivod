import type { WatchHistoryEntry } from '@/core/entities';

export type SeriesPlayTarget = {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
};

type SeasonLike = {
  seasonNumber: number;
  episodes?: Array<{
    id: string;
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  }>;
};

export function resolveSeriesPlayTarget(
  seasons: SeasonLike[],
  resume?: WatchHistoryEntry | null,
): SeriesPlayTarget | null {
  const ordered: SeriesPlayTarget[] = [];
  for (const season of [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    for (const ep of [...(season.episodes ?? [])].sort(
      (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
    )) {
      ordered.push({
        episodeId: ep.id,
        seasonNumber: ep.seasonNumber ?? season.seasonNumber,
        episodeNumber: ep.episodeNumber ?? 0,
      });
    }
  }
  if (!ordered.length) return null;
  if (resume?.episodeId) {
    const hit = ordered.find((e) => e.episodeId === resume.episodeId);
    if (hit) return hit;
  }
  return ordered[0];
}

export function resolveNextEpisode(
  seasons: SeasonLike[],
  currentEpisodeId: string,
): { id: string; title: string; episodeNumber: number } | null {
  const all: Array<{ id: string; title: string; episodeNumber: number }> = [];
  for (const season of [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    for (const ep of [...(season.episodes ?? [])].sort(
      (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
    )) {
      all.push({
        id: ep.id,
        title: ep.title ?? '',
        episodeNumber: ep.episodeNumber ?? 0,
      });
    }
  }
  const idx = all.findIndex((e) => e.id === currentEpisodeId);
  if (idx < 0 || idx >= all.length - 1) return null;
  return all[idx + 1];
}

export function formatSeriesPlayLabel(
  target: SeriesPlayTarget,
  mode: 'play' | 'resume',
  watchedSeconds?: number | null,
): string {
  const verb = mode === 'resume' ? 'Reprendre' : 'Lire';
  const base = `${verb} S. ${target.seasonNumber} Ép. ${target.episodeNumber}`;
  if (mode === 'resume' && watchedSeconds && watchedSeconds > 60) {
    const min = Math.floor(watchedSeconds / 60);
    return `${base} · ${min} min`;
  }
  return base;
}
