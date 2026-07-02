import { get } from './client';

export type HomeSectionType =
  | 'continue_watching'
  | 'my_list'
  | 'recommendations'
  | 'catalog_query'
  | 'trending';

export interface HomeSection {
  id: string;
  title: string;
  type: HomeSectionType;
  requiresAuth?: boolean;
  hideIfEmpty?: boolean;
  params?: {
    contentType?: string;
    genre?: string;
    genreCodes?: string[];
    sort?: string;
    limit?: number;
    isExclusive?: boolean;
    countryOfOrigin?: string;
    publishedWithinDays?: number;
    minRating?: number;
    tags?: string[];
    period?: string;
  };
}

export interface HomeConfig {
  sortOptions: { code: string; label: string }[];
  paidPlanOrder: string[];
  ppvPriceSuggestions: number[];
}

export function fetchHomeSections(): Promise<HomeSection[]> {
  return get<HomeSection[]>('/home/sections');
}

export function fetchHomeConfig(): Promise<HomeConfig> {
  return get<HomeConfig>('/home/config');
}
