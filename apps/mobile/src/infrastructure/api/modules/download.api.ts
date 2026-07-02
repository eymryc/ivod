/**
 * Module API — Téléchargements (licence serveur + package HLS).
 */

import { api } from '../client';

export interface DownloadRegistration {
  id: string;
  downloadId?: string;
  expiresAt?: string;
  format?: 'HLS' | 'MP4';
  masterManifestUrl?: string;
  playbackToken?: string;
  tokenExpiresAt?: string;
  /** @deprecated */
  downloadUrl?: string;
}

export const downloadApi = {
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

  list: (): Promise<DownloadRegistration[]> => api.get<DownloadRegistration[]>('/downloads'),

  remove: (id: string): Promise<void> => api.delete(`/downloads/${id}`),
};
