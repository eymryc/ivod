import type { WatchHistoryEntry } from "@/lib/utils/watch-resume";

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
    episodeNumber: number;
  }>;
};

/** Prochain épisode à lire : reprise si possible, sinon premier épisode publié (ordre saison / épisode). */
export function resolveSeriesPlayTarget(
  seasons: SeasonLike[],
  resume?: WatchHistoryEntry | null,
): SeriesPlayTarget | null {
  const ordered: SeriesPlayTarget[] = [];
  for (const season of [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    for (const ep of [...(season.episodes ?? [])].sort(
      (a, b) => a.episodeNumber - b.episodeNumber,
    )) {
      ordered.push({
        episodeId: ep.id,
        seasonNumber: ep.seasonNumber ?? season.seasonNumber,
        episodeNumber: ep.episodeNumber,
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

export function formatSeriesPlayLabel(
  target: SeriesPlayTarget,
  mode: "play" | "resume",
): string {
  const verb = mode === "resume" ? "Reprendre" : "Lire";
  return `${verb} S. ${target.seasonNumber} Ép. ${target.episodeNumber}`;
}
