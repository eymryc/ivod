import axios from "axios";
import { videosApi } from "@/lib/api/videos";

export function titleFromVideoFile(file: File, episodeNumber: number): string {
  const base = file.name
    .replace(/\.[^.]+$/i, "")
    .replace(/[._-]+/g, " ")
    .trim();
  return base.length > 0 ? base : `Épisode ${episodeNumber}`;
}

export async function uploadEpisodeVideoFile(
  episodeId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { uploadUrl, assetId } = await videosApi.getEpisodeUploadUrl(episodeId, file.type);
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type || "video/mp4" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  await videosApi.markComplete(assetId);
}
