import { del, get, patch, post } from "./client";

export const mediaAssetsApi = {
  getUploadUrl: (contentId: string, data: { assetType: string; mimeType: string }) =>
    post<{ uploadUrl: string; objectKey: string }>(`/media-assets/contents/${contentId}/upload-url`, data),

  register: (contentId: string, data: {
    type: string;
    objectKey: string;
    mimeType: string;
    width?: number;
    height?: number;
    isPrimary?: boolean;
    promoVariant?: string;
    durationSec?: number;
    label?: string;
    sortOrder?: number;
  }) =>
    post<{ id: string; durationSec?: number | null; type?: { code?: string; label?: string } }>(
      `/media-assets/contents/${contentId}`,
      data,
    ),

  listPromo: (contentId: string, locale?: string) =>
    get<any>(
      `/media-assets/contents/${contentId}/promo${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`,
      "optional",
    ),

  setPrimary: (assetId: string) =>
    patch<{ id: string; isPrimary: boolean }>(`/media-assets/${assetId}/set-primary`),

  remove: (assetId: string) => del<void>(`/media-assets/${assetId}`),
};
