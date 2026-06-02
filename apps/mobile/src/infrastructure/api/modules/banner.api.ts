/**
 * Module API — Banners promotionnels.
 */

import { api } from '../client';

export interface Banner {
  id: string;
  title?: string;
  imageUrl?: string;
  link?: string;
  country?: string;
  plan?: string;
}

export const bannerApi = {
  /**
   * Liste les banners actifs pour un pays et un plan donné.
   * Utilisé pour la page d'accueil et le catalogue.
   */
  list: (country = 'CI', plan = 'FREE'): Promise<Banner[]> =>
    api.get<Banner[]>(`/banners?country=${country}&plan=${plan}`, 'optional'),
};
