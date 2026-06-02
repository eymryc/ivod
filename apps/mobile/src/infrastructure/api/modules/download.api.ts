/**
 * Module API — Téléchargements (côté serveur).
 * Enregistre et gère les droits de téléchargement côté API.
 * La gestion des fichiers locaux est dans OfflineService.
 */

import { api } from '../client';

/** Résultat de l'enregistrement d'un téléchargement côté API. */
export interface DownloadRegistration {
  id: string;
  downloadId?: string;
  expiresAt?: string;
}

export const downloadApi = {
  /** Enregistre un téléchargement côté API et retourne son identifiant. */
  register: (
    contentId: string,
    quality = '720p',
    episodeId?: string,
  ): Promise<DownloadRegistration> =>
    api.post<DownloadRegistration>('/downloads', {
      contentId,
      quality,
      ...(episodeId ? { episodeId } : {}),
    }),

  /** Liste les téléchargements enregistrés côté API. */
  list: (): Promise<DownloadRegistration[]> =>
    api.get<DownloadRegistration[]>('/downloads'),

  /** Supprime un téléchargement côté API. */
  remove: (id: string): Promise<void> =>
    api.delete(`/downloads/${id}`),
};
