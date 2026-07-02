import axios from "axios";
import { mediaAssetsApi } from "./media-assets";
import type { PromoVideoTypeCode } from "@/core/entities/promo.entity";

export interface UploadPromoVideoInput {
  file: File;
  type: PromoVideoTypeCode;
  isPrimary?: boolean;
  sortOrder?: number;
  onUploadProgress?: (percent: number) => void;
}

export interface UploadPromoVideoResult {
  id: string;
  durationSec?: number | null;
  type?: { code?: string; label?: string };
}

/** Presign MinIO → PUT → enregistrement asset promo (teaser, BA, extras). */
export async function uploadPromoVideo(
  contentId: string,
  input: UploadPromoVideoInput,
): Promise<UploadPromoVideoResult> {
  const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(contentId, {
    assetType: input.type,
    mimeType: input.file.type || "video/mp4",
  });
  await axios.put(uploadUrl, input.file, {
    headers: { "Content-Type": input.file.type || "video/mp4" },
    onUploadProgress: (e) => {
      if (!input.onUploadProgress || !e.total) return;
      input.onUploadProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return mediaAssetsApi.register(contentId, {
    type: input.type,
    objectKey,
    mimeType: input.file.type || "video/mp4",
    isPrimary: input.isPrimary,
    sortOrder: input.sortOrder,
  });
}
