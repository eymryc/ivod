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
  genre?: string;
  maxMaturityRating?: string;
}

export interface SearchResult {
  items: Content[];
  total?: number;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  type?: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface AutocompleteResult {
  suggestions: Array<{
    type: 'content' | 'creator';
    id: string;
    title: string;
    subtitle?: string;
    posterObjectKey?: string;
    avatarObjectKey?: string;
  }>;
}

export const searchApi = {
  search: (params: SearchParams): Promise<SearchResult> =>
    api.get<SearchResult>(`/search${buildQueryString(params)}`, 'optional'),

  autocomplete: (q: string, maxMaturityRating?: string): Promise<AutocompleteResult> =>
    api.get<AutocompleteResult>(
      `/search/autocomplete${buildQueryString({ q, maxMaturityRating })}`,
      'optional',
    ),

  getHistory: (): Promise<{ items: Array<{ query: string; searchedAt?: string }> }> =>
    api.get('/search/history'),

  clearHistory: (): Promise<void> =>
    api.delete('/search/history'),

  trending: (period = '24h'): Promise<Content[] | { items: Content[] }> =>
    api.get(`/search/trending${buildQueryString({ period })}`, 'optional'),
};
