const RELEASE_MARKERS =
  /\b(1080p|720p|2160p|4k|MULTI|VOSTFR|VF|WEB-?DL|AMZN|NF|HDTV|BluRay|x264|x265|HEVC|PROPER|REPACK)\b/i;
const SEASON_EP = /S(\d{1,2})E(\d{1,2})/i;

/** Nettoie les titres d'épisode issus de noms de fichiers release. */
export function formatEpisodeDisplayTitle(
  title: string,
  episodeNumber: number,
): { primary: string; secondary?: string } {
  const trimmed = title.trim();
  if (!trimmed) {
    return { primary: `Épisode ${episodeNumber}` };
  }

  const looksLikeRelease =
    RELEASE_MARKERS.test(trimmed) || SEASON_EP.test(trimmed) || trimmed.length > 48;

  if (!looksLikeRelease) {
    return { primary: trimmed };
  }

  const beforeSeasonEp = trimmed.split(SEASON_EP)[0] ?? trimmed;
  const showName = beforeSeasonEp.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();

  if (showName.length >= 3 && showName.length <= 42 && !RELEASE_MARKERS.test(showName)) {
    return { primary: `Épisode ${episodeNumber}`, secondary: showName };
  }

  return { primary: `Épisode ${episodeNumber}` };
}
