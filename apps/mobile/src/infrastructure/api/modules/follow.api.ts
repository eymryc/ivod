/**
 * Module API — Abonnements aux créateurs.
 */

import { api } from '../client';

export interface FollowStatus {
  isFollowing: boolean;
}

export const followApi = {
  /** Liste les créateurs suivis par l'utilisateur. */
  list: (): Promise<unknown[]> =>
    api.get<unknown[]>('/follows'),

  /**
   * Récupère le statut de suivi d'un créateur.
   * Normalise les champs following / isFollowing selon la version de l'API.
   */
  getStatus: async (creatorId: string): Promise<FollowStatus> => {
    const r = await api.get<{ following?: boolean; isFollowing?: boolean }>(
      `/follows/${creatorId}/status`,
      'optional',
    );
    return { isFollowing: r.isFollowing ?? r.following ?? false };
  },

  /** Abonne l'utilisateur à un créateur. */
  follow: (creatorId: string): Promise<void> =>
    api.post(`/follows/${creatorId}`),

  /** Désabonne l'utilisateur d'un créateur. */
  unfollow: (creatorId: string): Promise<void> =>
    api.delete(`/follows/${creatorId}`),
};
