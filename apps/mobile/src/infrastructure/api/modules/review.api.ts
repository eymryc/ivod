/**
 * Module API — Avis (reviews) sur les contenus.
 */

import { api, buildQueryString } from '../client';

export interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  user?: { name?: string; avatarUrl?: string | null };
}

export interface ReviewListResult {
  items: Review[];
  total: number;
  averageRating?: number;
}

export const reviewApi = {
  /** Liste les avis paginés d'un contenu. */
  list: (contentId: string, page = 1, limit = 20): Promise<ReviewListResult> =>
    api.get<ReviewListResult>(
      `/reviews/contents/${contentId}${buildQueryString({ page, limit })}`,
      'optional',
    ),

  /** Crée ou met à jour l'avis de l'utilisateur sur un contenu. */
  upsert: (
    contentId: string,
    rating: number,
    title?: string,
    body?: string,
  ): Promise<void> =>
    api.post(`/reviews/contents/${contentId}`, { rating, title, body }),

  /** Supprime l'avis de l'utilisateur sur un contenu. */
  remove: (contentId: string): Promise<void> =>
    api.delete(`/reviews/contents/${contentId}`),
};
