/**
 * Module API — Commentaires sur les contenus.
 */

import { api, buildQueryString } from '../client';

export interface Comment {
  id: string;
  body: string;
  parentId?: string | null;
  createdAt: string;
  user?: { name?: string; avatarUrl?: string | null };
}

export interface CommentListResult {
  items: Comment[];
  total: number;
}

export const commentApi = {
  /** Liste les commentaires paginés d'un contenu. */
  list: (contentId: string, page = 1, limit = 20): Promise<CommentListResult> =>
    api.get<CommentListResult>(
      `/comments/contents/${contentId}${buildQueryString({ page, limit })}`,
      'optional',
    ),

  /** Publie un commentaire (avec support de réponse via parentId). */
  create: (contentId: string, body: string, parentId?: string): Promise<Comment> =>
    api.post<Comment>(`/comments/contents/${contentId}`, { body, parentId }),

  /** Modifie un commentaire existant. */
  update: (id: string, body: string): Promise<void> =>
    api.patch(`/comments/${id}`, { body }),

  /** Supprime un commentaire. */
  remove: (id: string): Promise<void> =>
    api.delete(`/comments/${id}`),
};
