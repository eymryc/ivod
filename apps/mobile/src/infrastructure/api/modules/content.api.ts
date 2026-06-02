/**
 * Module API — Contenus vidéo.
 * Accès aux contenus, droits d'accès, saisons, épisodes et progression.
 */

import { api, buildQueryString } from '../client';
import type {
  Content,
  ContentListResult,
  Entitlement,
  Season,
} from '@/core/entities';

/** Paramètres de filtrage de la liste des contenus. */
export interface ContentListParams extends Record<string, string | number | undefined> {
  page?: number;
  limit?: number;
  contentType?: string;
  genreCode?: string;
  creatorId?: string;
  search?: string;
}

export const contentApi = {
  /**
   * Récupère une liste paginée de contenus.
   * Auth optionnelle : permet d'injecter la progression utilisateur si connecté.
   */
  list: (params?: ContentListParams): Promise<ContentListResult> =>
    api.get<ContentListResult>(`/contents${buildQueryString(params)}`, 'optional'),

  /**
   * Récupère le détail d'un contenu.
   * profileId est nécessaire pour récupérer la progression du profil actif.
   */
  getOne: (id: string, profileId?: string): Promise<Content> =>
    api.get<Content>(
      `/contents/${id}${buildQueryString(profileId ? { profileId } : undefined)}`,
      'optional',
    ),

  /**
   * Vérifie les droits d'accès de l'utilisateur sur un contenu.
   * Retourne hasAccess et la raison (SVOD, AVOD, PPV).
   */
  getEntitlement: (id: string, profileId?: string): Promise<Entitlement> =>
    api.get<Entitlement>(
      `/contents/${id}/entitlement${buildQueryString(profileId ? { profileId } : undefined)}`,
    ),

  /**
   * Enregistre la progression de visionnage.
   * Appelé périodiquement pendant la lecture (toutes les ~15s).
   */
  updateProgress: (
    contentId: string,
    watchedSeconds: number,
    episodeId?: string,
    profileId?: string,
  ): Promise<void> =>
    api.post(`/contents/${contentId}/progress`, {
      watchedSeconds,
      episodeId,
      ...(profileId ? { profileId } : {}),
    }),

  /** Récupère les saisons et épisodes d'une série. */
  getSeasons: (contentId: string): Promise<Season[]> =>
    api.get<Season[]>(`/seasons/contents/${contentId}`, 'optional'),
};
