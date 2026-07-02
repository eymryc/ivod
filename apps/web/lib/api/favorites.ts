import { buildQueryString, del, get, post } from "./client";

function profileQs(profileId?: string | null) {
  return buildQueryString(profileId ? { profileId } : undefined);
}

export const favoritesApi = {
  list: (page = 1, limit = 20, profileId?: string | null) =>
    get<any>(`/favorites?page=${page}&limit=${limit}${profileId ? `&profileId=${profileId}` : ""}`, true),

  status: (contentId: string, profileId?: string | null) =>
    get<{ isFavorite: boolean }>(`/favorites/status/${contentId}${profileQs(profileId)}`, true),

  add: (contentId: string, profileId?: string | null) =>
    post<{ isFavorite: boolean; message: string }>(
      `/favorites/${contentId}${profileQs(profileId)}`,
      undefined,
      true,
    ),

  remove: (contentId: string, profileId?: string | null) =>
    del<{ isFavorite: boolean; message: string }>(
      `/favorites/${contentId}${profileQs(profileId)}`,
      true,
    ),
};
