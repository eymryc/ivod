import axios from "axios";
import { mediaAssetsApi } from "./media-assets";

/** Upload affiche POSTER (aligné création contenu + affichage catalogue). */
export async function uploadContentPoster(contentId: string, file: File) {
  const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(contentId, {
    assetType: "POSTER",
    mimeType: file.type,
  });
  await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
  return mediaAssetsApi.register(contentId, {
    type: "POSTER",
    objectKey,
    mimeType: file.type,
    isPrimary: true,
  });
}
