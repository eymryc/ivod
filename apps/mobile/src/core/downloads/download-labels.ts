import { formatEpisodeDisplayTitle } from "@/core/utils/episode-display";

export type DownloadEpisodeLabel = {
  badge: string;
  primary: string;
  secondary?: string;
};

export function formatDownloadEpisodeLabel(episode?: {
  seasonNumber?: number;
  episodeNumber?: number;
  title?: string;
}): DownloadEpisodeLabel | null {
  if (!episode?.episodeNumber) return null;

  const season = episode.seasonNumber ?? 1;
  const ep = episode.episodeNumber;
  const badge = `S${String(season).padStart(2, "0")}E${String(ep).padStart(2, "0")}`;
  const display = formatEpisodeDisplayTitle(episode.title ?? "", ep);

  return {
    badge,
    primary: display.primary,
    secondary: display.secondary,
  };
}
