/**
 * Module API — Créateurs de contenu.
 */

import { api, buildQueryString } from '../client';
import type { ContentCreator, Content, ContentListResult } from '@/core/entities';

export const creatorApi = {
  /** Récupère le profil public d'un créateur. */
  getOne: (id: string): Promise<ContentCreator> =>
    api.get<ContentCreator>(`/creators/${id}`, 'optional'),

  /** Liste les contenus publiés par un créateur. */
  getContents: (id: string, page = 1): Promise<ContentListResult> =>
    api.get<ContentListResult>(
      `/contents${buildQueryString({ creatorId: id, page, limit: 20 })}`,
      'optional',
    ),
};
