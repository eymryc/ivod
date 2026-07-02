import { buildQueryString, get, post } from "./client";

function profileQs(profileId?: string | null) {
  return buildQueryString(profileId ? { profileId } : undefined);
}

export const likesApi = {
  status: (contentId: string, profileId?: string | null) =>
    get<{ liked: boolean; likeCount?: number }>(
      `/likes/${contentId}${profileQs(profileId)}`,
      true,
    ),
  toggle: (contentId: string, profileId?: string | null) =>
    post<{ liked: boolean; likeCount?: number }>(
      `/likes/${contentId}${profileQs(profileId)}`,
      undefined,
      true,
    ),
};
