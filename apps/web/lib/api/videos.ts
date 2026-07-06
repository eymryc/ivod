import { get, post, patch } from "./client";

export interface VideoPipelineStatus {
  status: string;
  percentage?: number;
  currentStep?: string;
}

export interface VideoUploadStatusResponse {
  status: string;
  assetId?: string | null;
  assetStatus?: string;
  playable?: boolean;
  /** Une rendition (aperçu 720p) est déjà publiée, même si le statut est repassé à TRANSCODING pour la qualité complète. */
  previewAvailable?: boolean;
  progress?: VideoPipelineStatus;
  durationSec?: number | null;
  posterObjectKey?: string | null;
  errorMessage?: string | null;
  pipeline?: {
    completedProfiles: string[];
    remainingProfiles: string[];
    activeJobType?: string | null;
  };
}

export interface MultipartInitResponse {
  assetId: string;
  uploadId: string;
  objectKey: string;
  bucket: string;
  contentId: string;
  partSizeBytes: number;
  expiresAt: string;
}

export interface MultipartPartUrlResponse {
  uploadUrl: string;
  partNumber: number;
  uploadId: string;
  expiresAt: string;
}

export const videosApi = {
  getUploadUrl: (contentId: string, mimeType?: string) =>
    post<{ uploadUrl: string; assetId: string; objectKey: string; bucket: string }>(
      "/videos/upload-url",
      { contentId, mimeType },
    ),
  initMultipart: (contentId: string, mimeType?: string, fileSizeBytes?: number) =>
    post<MultipartInitResponse>("/videos/multipart/init", { contentId, mimeType, fileSizeBytes }),
  getMultipartPartUrl: (assetId: string, uploadId: string, partNumber: number) =>
    post<MultipartPartUrlResponse>(`/videos/assets/${assetId}/multipart/part-url`, {
      uploadId,
      partNumber,
    }),
  completeMultipart: (
    assetId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ) =>
    patch<{ assetId: string }>(`/videos/assets/${assetId}/multipart/complete`, {
      uploadId,
      parts,
    }),
  initEpisodeMultipart: (episodeId: string, mimeType?: string, fileSizeBytes?: number) =>
    post<MultipartInitResponse>("/videos/episodes/multipart/init", {
      episodeId,
      mimeType,
      fileSizeBytes,
    }),
  getEpisodeUploadUrl: (episodeId: string, mimeType?: string) =>
    post<{ uploadUrl: string; assetId: string; objectKey: string }>(
      "/videos/episodes/upload-url",
      { episodeId, mimeType },
    ),
  markComplete: (assetId: string) => patch<{ assetId: string }>(`/videos/assets/${assetId}/complete`),
  retryPipeline: (assetId: string) =>
    post<{ assetId: string; status: string; message: string }>(`/videos/assets/${assetId}/retry`),
  getStatus: (contentId: string) =>
    get<VideoUploadStatusResponse>(`/videos/${contentId}/status`),
  getEpisodeStatus: (episodeId: string) =>
    get<VideoUploadStatusResponse>(`/videos/episodes/${episodeId}/status`),
  getStreamUrl: async (contentId: string) => {
    const data = await get<{
      url?: string;
      playbackUrl?: string;
      playbackToken?: string;
      format?: string;
    }>(`/videos/${contentId}/stream`, true);
    const url = data.url ?? data.playbackUrl;
    if (!url) throw new Error("URL de lecture manquante");
    return {
      url,
      format: data.format,
      playbackToken: data.playbackToken,
    };
  },
  getEpisodeStreamUrl: async (episodeId: string) => {
    const data = await get<{
      url?: string;
      playbackUrl?: string;
      playbackToken?: string;
      format?: string;
    }>(`/videos/episodes/${episodeId}/stream`, true);
    const url = data.url ?? data.playbackUrl;
    if (!url) throw new Error("URL de lecture manquante");
    return {
      url,
      format: data.format,
      playbackToken: data.playbackToken,
    };
  },
};
