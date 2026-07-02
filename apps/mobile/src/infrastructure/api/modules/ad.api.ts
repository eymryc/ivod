/**
 * Module API — Publicités (AVOD).
 */

import { api } from '../client';
import type { Ad } from '@/core/entities';

export const adApi = {
  /**
   * Récupère la prochaine publicité à afficher.
   * Retourne null si aucune pub n'est disponible (pas d'erreur levée).
   */
  getNext: (): Promise<Ad | null> =>
    api.get<Ad | null>('/ads/next').catch(() => null),

  /**
   * Enregistre une impression publicitaire.
   * Silencieux : les erreurs ne doivent pas bloquer l'expérience.
   */
  recordImpression: (adId: string, clicked = false): Promise<void> =>
    api.post(`/ads/${adId}/impression`, { clicked }).catch(() => undefined) as Promise<void>,
};
