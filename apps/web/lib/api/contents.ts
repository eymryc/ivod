import { buildQueryString, get, post, put, patch, del } from "./client";

export type ContentsListParams = {
  page?: number;
  limit?: number;
  /** @deprecated — utiliser contentType */
  category?: string;
  contentType?: string;
  genre?: string;
  /** Codes genres multiples (OR), séparés par virgule */
  genreCodes?: string;
  sort?: string;
  year?: number;
  minRating?: number;
  countryOfOrigin?: string;
  maxMaturityRating?: string;
  isExclusive?: boolean;
  publishedWithinDays?: number;
  search?: string;
  status?: string;
  creatorId?: string;
  ids?: string;
};

export const contentsApi = {
  list: (params?: ContentsListParams | Record<string, string | number | undefined>) => {
    const qs = buildQueryString(params as Record<string, string | number | boolean | undefined>);
    return get<any>(`/contents${qs}`);
  },
  getOne: (id: string, profileId?: string | null) => {
    const qs = buildQueryString(profileId ? { profileId } : undefined);
    return get<any>(`/contents/${id}${qs}`, true);
  },
  create: (data: any) => post<any>("/contents", data),
  update: (id: string, data: any) => put<any>(`/contents/${id}`, data),
  remove: (id: string) => del<any>(`/contents/${id}`),
  submitForReview: (id: string) => patch<any>(`/contents/${id}/submit`),
  getEntitlement: async (id: string, profileId?: string) => {
    const qs = buildQueryString(profileId ? { profileId } : undefined);
    const raw = await get<{
      hasAccess?: boolean;
      canPlay?: boolean;
      reason?: string;
      visibility?: string;
      planCode?: string | null;
      ppvPrice?: number | null;
    }>(`/contents/${id}/entitlement${qs}`, true);
    const hasAccess = raw.hasAccess ?? raw.canPlay ?? false;
    const reason =
      raw.reason === "OK"
        ? hasAccess
          ? "SVOD"
          : "NOT_AVAILABLE"
        : raw.reason === "ACCESS_DENIED"
          ? "SVOD"
          : (raw.reason as "SVOD" | "TVOD" | "AVOD" | "NOT_AVAILABLE" | "GEO_BLOCKED") ?? "NOT_AVAILABLE";
    return { ...raw, hasAccess, reason };
  },
  getEpisodes: (contentId: string) => get<any>(`/episodes/contents/${contentId}`),
  getSeasons: (contentId: string) => get<any>(`/seasons/contents/${contentId}`),
  // S3 — Sauvegarder la progression de lecture (backup du heartbeat)
  updateProgress: (
    contentId: string,
    watchedSeconds: number,
    episodeId?: string,
    profileId?: string | null,
  ) =>
    post<void>(
      `/contents/${contentId}/progress`,
      { watchedSeconds, episodeId, ...(profileId ? { profileId } : {}) },
      true,
    ).catch(() => {}),
};
