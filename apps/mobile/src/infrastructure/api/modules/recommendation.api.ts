/**
 * Module API — Recommandations personnalisées.
 */

import { api, buildQueryString } from '../client';
import type { Content } from '@/core/entities';

export interface RecommendationResult {
  items: Content[];
}

export const recommendationApi = {
  /**
   * Récupère les recommandations personnalisées.
   * Si profileId est fourni, adapte les suggestions au profil actif.
   */
  list: (profileId?: string, limit = 20): Promise<RecommendationResult> => {
    const params = profileId ? { profileId, limit } : { limit };
    return api.get<RecommendationResult>(`/recommendations${buildQueryString(params)}`);
  },

  /** Déclenche le recalcul des recommandations (opération asynchrone). */
  generate: (): Promise<void> =>
    api.post('/recommendations/generate'),
};
