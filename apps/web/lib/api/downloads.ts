import { get, post, del } from "./client";

export type DownloadPackage = {
  downloadId: string;
  contentId: string;
  episodeId?: string | null;
  format?: "HLS" | "MP4";
  masterManifestUrl?: string;
  tokenExpiresAt?: string;
  expiresAt?: string;
  quality?: string;
  title?: string;
};

export const downloadsApi = {
  list: () => get<DownloadPackage[]>("/downloads", true),
  add: (contentId: string, quality: "480p" | "720p" | "1080p" = "720p", episodeId?: string) =>
    post<DownloadPackage>("/downloads", {
      contentId,
      quality,
      ...(episodeId ? { episodeId } : {}),
    }),
  remove: (id: string) => del<any>(`/downloads/${id}`),
};
