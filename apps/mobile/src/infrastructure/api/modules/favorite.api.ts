/**
 * Module API — Favoris.
 */

import { api, buildQueryString } from '../client';
import type { Content } from '@/core/entities';

export interface FavoriteStatus {
  isFavorite: boolean;
}

export interface FavoriteListResult {
  items: Content[];
  total?: number;
}

export const favoriteApi = {
  /** Liste les contenus favoris du profil actif. */
  list: (page = 1, profileId?: string): Promise<FavoriteListResult> =>
    api.get<FavoriteListResult>(
      `/favorites${buildQueryString({ page, limit: 20, ...(profileId ? { profileId } : {}) })}`
    ),

  /** Vérifie si un contenu est dans les favoris. */
  getStatus: (contentId: string, profileId?: string): Promise<FavoriteStatus> =>
    api.get<FavoriteStatus>(
      `/favorites/status/${contentId}${buildQueryString(profileId ? { profileId } : undefined)}`,
    ),

  /** Ajoute un contenu aux favoris. */
  add: (contentId: string, profileId?: string): Promise<void> =>
    api.post(
      `/favorites/${contentId}${buildQueryString(profileId ? { profileId } : undefined)}`,
    ),

  /** Retire un contenu des favoris. */
  remove: (contentId: string, profileId?: string): Promise<void> =>
    api.delete(
      `/favorites/${contentId}${buildQueryString(profileId ? { profileId } : undefined)}`,
    ),
};
