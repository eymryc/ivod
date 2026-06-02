import { api, buildQueryString } from '../client';

export interface LikeStatus {
  liked: boolean;
  likeCount?: number;
}

export const likeApi = {
  getStatus: (contentId: string, profileId?: string): Promise<LikeStatus> =>
    api.get<LikeStatus>(
      `/likes/${contentId}${buildQueryString(profileId ? { profileId } : undefined)}`,
      'optional',
    ),

  toggle: (contentId: string, profileId?: string): Promise<LikeStatus> =>
    api.post<LikeStatus>(
      `/likes/${contentId}${buildQueryString(profileId ? { profileId } : undefined)}`,
    ),
};
