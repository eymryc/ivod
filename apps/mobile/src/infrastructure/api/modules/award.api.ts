/**
 * Module API — Récompenses associées aux contenus.
 */

import { api } from '../client';

export interface Award {
  id: string;
  name: string;
  category?: string | null;
  year?: number | null;
  won: boolean;
}

export const awardApi = {
  /** Liste les récompenses d'un contenu. */
  listForContent: (contentId: string): Promise<Award[]> =>
    api.get<Award[]>(`/awards/contents/${contentId}`, 'optional'),
};
