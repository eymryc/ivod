/**
 * Module API — Recherche & Tendances.
 */

import { api, buildQueryString } from '../client';
import type { Content } from '@/core/entities';

export interface SearchParams extends Record<string, string | number | undefined> {
  q: string;
  page?: number;
  limit?: number;
  contentType?: string;
}

export interface SearchResult {
  items: Content[];
  total?: number;
}

export const searchApi = {
  /** Recherche de contenus par texte libre. */
  search: (params: SearchParams): Promise<SearchResult> =>
    api.get<SearchResult>(`/search${buildQueryString(params)}`, 'optional'),

  /** Récupère les contenus tendance sur la période donnée. */
  trending: (period = '24h'): Promise<Content[] | { items: Content[] }> =>
    api.get(`/search/trending${buildQueryString({ period })}`, 'optional'),
};
