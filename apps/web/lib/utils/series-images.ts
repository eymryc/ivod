import axios from "axios";
import { episodesApi } from "@/lib/api/episodes";
import { mediaAssetsApi } from "@/lib/api/media-assets";

/** Vignette épisode (cover) — stockée sur `episode.thumbnailObjectKey`. */
export async function uploadEpisodeThumbnail(
  episodeId: string,
  contentId: string,
  file: File,
) {
  const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(contentId, {
    assetType: "THUMBNAIL",
    mimeType: file.type,
  });
  await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
  await episodesApi.updateEpisode(episodeId, { thumbnailObjectKey: objectKey });
  return objectKey;
}

/** Affiche saison — stockée sur `season.posterObjectKey`. */
export async function uploadSeasonPoster(seasonId: string, contentId: string, file: File) {
  const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(contentId, {
    assetType: "POSTER",
    mimeType: file.type,
  });
  await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
  await episodesApi.updateSeason(seasonId, { posterObjectKey: objectKey });
  return objectKey;
}
