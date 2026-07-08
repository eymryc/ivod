import axios from "axios";
import { mediaAssetsApi } from "./media-assets";

async function uploadContentImage(contentId: string, file: File, assetType: "POSTER" | "BANNER") {
  const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(contentId, {
    assetType,
    mimeType: file.type,
  });
  await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
  return mediaAssetsApi.register(contentId, {
    type: assetType,
    objectKey,
    mimeType: file.type,
    isPrimary: true,
  });
}

/** Upload affiche POSTER (aligné création contenu + affichage catalogue). */
export async function uploadContentPoster(contentId: string, file: File) {
  return uploadContentImage(contentId, file, "POSTER");
}

/** Upload bannière hero BANNER (bandeau paysage de la fiche contenu). */
export async function uploadContentBanner(contentId: string, file: File) {
  return uploadContentImage(contentId, file, "BANNER");
}
