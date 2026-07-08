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
  | "resume_tonight"
  | "unfinished"
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
  releaseYearFrom?: number;
  releaseYearTo?: number;
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
  targetPlanCodes?: string[];
  targetCountryCodes?: string[];
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
  queryJson: CatalogRailQuery | null;
  targetPlanCodes: string[];
  targetCountryCodes: string[];
  _count: { items: number };
  items: { contentId: string; position: number; content: { id: string; title: string } }[];
};

export type ResolvedCatalogRail = CatalogRail & { items: unknown[] };

export const catalogApi = {
  getRails: (surface: CatalogRailSurface, plan?: string | null, country?: string | null) =>
    get<CatalogRail[]>(
      `/catalog/rails?surface=${surface}${plan ? `&plan=${encodeURIComponent(plan)}` : ""}${
        country ? `&country=${encodeURIComponent(country)}` : ""
      }`,
    ),

  /** Rails + contenus des rails query/editorial résolus en un seul appel. */
  getResolvedRails: (
    surface: CatalogRailSurface,
    maxMaturityRating?: string | null,
    plan?: string | null,
    country?: string | null,
  ) =>
    get<ResolvedCatalogRail[]>(
      `/catalog/rails/resolved?surface=${surface}${
        maxMaturityRating ? `&maxMaturityRating=${encodeURIComponent(maxMaturityRating)}` : ""
      }${plan ? `&plan=${encodeURIComponent(plan)}` : ""}${
        country ? `&country=${encodeURIComponent(country)}` : ""
      }`,
    ),

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
      targetPlanCodes: string[];
      targetCountryCodes: string[];
      query: CatalogRailQuery;
    }>,
  ) => patch<AdminCatalogRail>(`/admin/catalog-rails/${code}`, data),

  adminReorder: (surface: CatalogRailSurface, codes: string[]) =>
    put<{ success: boolean }>("/admin/catalog-rails/reorder", { surface, codes }),

  adminSetItems: (code: string, contentIds: string[]) =>
    put<AdminCatalogRail>(`/admin/catalog-rails/${code}/items`, { contentIds }),

  adminCreateRail: (data: {
    code: string;
    title: string;
    surfaces: CatalogRailSurface[];
    subtitle?: string;
    link?: string;
    type?: "editorial" | "query";
    query?: CatalogRailQuery;
    targetPlanCodes?: string[];
    targetCountryCodes?: string[];
  }) => post<AdminCatalogRail>("/admin/catalog-rails", data),
};
