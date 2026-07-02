import { get, post, patch, del } from "./client";

export const episodesApi = {
  // Saisons
  getSeasons: (contentId: string) =>
    get<any[]>(`/seasons/contents/${contentId}`, true),
  createSeason: (contentId: string, data: { seasonNumber: number; title?: string; description?: string }) =>
    post<any>(`/seasons/contents/${contentId}`, {
      number: data.seasonNumber,
      title: data.title,
      description: data.description,
    }),
  ensureDefaultSeason: (contentId: string) =>
    post<any[]>(`/seasons/contents/${contentId}/ensure-default`),
  updateSeason: (seasonId: string, data: { title?: string; description?: string; posterObjectKey?: string }) =>
    patch<any>(`/seasons/${seasonId}`, data),
  deleteSeason: (seasonId: string) =>
    del<any>(`/seasons/${seasonId}`),

  // Épisodes
  getEpisodes: (contentId: string) =>
    get<any[]>(`/episodes/contents/${contentId}`, true),
  createEpisode: (seasonId: string, data: { episodeNumber: number; title: string; description?: string; duration?: number }) =>
    post<any>(`/episodes/seasons/${seasonId}`, data),
  updateEpisode: (
    episodeId: string,
    data: {
      title?: string;
      description?: string;
      episodeNumber?: number;
      duration?: number;
      thumbnailObjectKey?: string;
    },
  ) => patch<any>(`/episodes/${episodeId}`, data),
  deleteEpisode: (episodeId: string) =>
    del<any>(`/episodes/${episodeId}`),
};
