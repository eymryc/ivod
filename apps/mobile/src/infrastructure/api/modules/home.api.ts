import { api } from '../client';

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
    sort?: string;
    limit?: number;
    tags?: string[];
    period?: string;
  };
}

export type CatalogQuerySection = HomeSection & {
  type: 'catalog_query';
  params: NonNullable<HomeSection['params']>;
};

export interface HomeConfig {
  sortOptions: { code: string; label: string }[];
  paidPlanOrder: string[];
  ppvPriceSuggestions: number[];
}

export const homeApi = {
  getSections: (): Promise<HomeSection[]> =>
    api.get<HomeSection[]>('/home/sections', false),

  getConfig: (): Promise<HomeConfig> =>
    api.get<HomeConfig>('/home/config', false),
};
