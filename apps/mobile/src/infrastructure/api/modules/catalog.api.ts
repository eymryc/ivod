import { api } from '../client';

export type CatalogRailSurface =
  | 'home'
  | 'films'
  | 'series'
  | 'web-series'
  | 'animation';

export type CatalogRailType = 'query' | 'personalized' | 'editorial';

export type CatalogRailPersonalizedKind =
  | 'continue_watching'
  | 'resume_tonight'
  | 'unfinished'
  | 'my_list'
  | 'recommendations';

export type CatalogRailQuery = {
  contentType?: string;
  genre?: string;
  genreCodes?: string[];
  sort?: string;
  limit?: number;
  isExclusive?: boolean;
  countryOfOrigin?: string;
  publishedWithinDays?: number;
  minRating?: number;
};

export type CatalogRail = {
  id: string;
  code: string;
  title: string;
  type: CatalogRailType;
  personalizedKind?: CatalogRailPersonalizedKind;
  requiresAuth?: boolean;
  hideIfEmpty?: boolean;
  query?: CatalogRailQuery;
  link?: string;
  contentIds?: string[];
};

export type ResolvedCatalogRail = CatalogRail & { items: unknown[] };

export const catalogApi = {
  getRails: (surface: CatalogRailSurface): Promise<CatalogRail[]> =>
    api.get<CatalogRail[]>(`/catalog/rails?surface=${surface}`, false),

  /** Rails + contenus des rails query/editorial résolus en un seul appel. */
  getResolvedRails: (
    surface: CatalogRailSurface,
    maxMaturityRating?: string | null,
  ): Promise<ResolvedCatalogRail[]> =>
    api.get<ResolvedCatalogRail[]>(
      `/catalog/rails/resolved?surface=${surface}${
        maxMaturityRating ? `&maxMaturityRating=${encodeURIComponent(maxMaturityRating)}` : ''
      }`,
      false,
    ),
};
