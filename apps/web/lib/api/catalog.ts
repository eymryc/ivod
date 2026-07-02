import { get, patch, post, put } from "./client";

export type CatalogRailSurface =
  | "home"
  | "films"
  | "series"
  | "web-series"
  | "animation";

export type CatalogRailType = "query" | "personalized" | "editorial";

export type CatalogRailPersonalizedKind =
  | "continue_watching"
  | "my_list"
  | "recommendations";

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
  subtitle?: string;
  type: CatalogRailType;
  personalizedKind?: CatalogRailPersonalizedKind;
  requiresAuth?: boolean;
  hideIfEmpty?: boolean;
  query?: CatalogRailQuery;
  link?: string;
  contentIds?: string[];
};

export type AdminCatalogRail = {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  surfaces: string[];
  type: string;
  isActive: boolean;
  position: number;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  _count: { items: number };
  items: { contentId: string; position: number; content: { id: string; title: string } }[];
};

export const catalogApi = {
  getRails: (surface: CatalogRailSurface) =>
    get<CatalogRail[]>(`/catalog/rails?surface=${surface}`),

  adminList: (surface?: CatalogRailSurface) =>
    get<AdminCatalogRail[]>(
      `/admin/catalog-rails${surface ? `?surface=${surface}` : ""}`,
      true,
    ),

  adminUpdate: (
    code: string,
    data: Partial<{
      title: string;
      subtitle: string | null;
      isActive: boolean;
      link: string | null;
      startsAt: string | null;
      endsAt: string | null;
    }>,
  ) => patch<AdminCatalogRail>(`/admin/catalog-rails/${code}`, data),

  adminReorder: (surface: CatalogRailSurface, codes: string[]) =>
    put<{ success: boolean }>("/admin/catalog-rails/reorder", { surface, codes }),

  adminSetItems: (code: string, contentIds: string[]) =>
    put<AdminCatalogRail>(`/admin/catalog-rails/${code}/items`, { contentIds }),

  adminCreateEditorial: (data: {
    code: string;
    title: string;
    surfaces: CatalogRailSurface[];
    subtitle?: string;
    link?: string;
  }) => post<AdminCatalogRail>("/admin/catalog-rails", data),
};
