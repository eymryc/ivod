import { videosApi } from "@/lib/api/videos";
import { uploadFileMultipart, type MultipartUploadCallbacks } from "@/lib/studio/multipart-upload";

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
  callbacks?: MultipartUploadCallbacks,
): Promise<void> {
  await uploadFileMultipart(
    file,
    `episode:${episodeId}`,
    {
      initMultipart: (mimeType, fileSizeBytes) =>
        videosApi.initEpisodeMultipart(episodeId, mimeType, fileSizeBytes),
      getPartUrl: (assetId, uploadId, partNumber) =>
        videosApi.getMultipartPartUrl(assetId, uploadId, partNumber),
      completeMultipart: (assetId, uploadId, parts) =>
        videosApi.completeMultipart(assetId, uploadId, parts).then(() => undefined),
    },
    callbacks,
  );
}
