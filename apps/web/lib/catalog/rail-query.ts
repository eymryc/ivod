import type { CatalogRailQuery } from "@/lib/api/catalog";
import type { ContentsListParams } from "@/lib/api/contents";

/** Mappe une requête rail → paramètres GET /contents. */
export function railQueryToListParams(
  query: CatalogRailQuery | undefined,
  maxMaturityCode?: string | null,
): ContentsListParams {
  if (!query) return { limit: 20 };

  return {
    contentType: query.contentType,
    genre: query.genre,
    genreCodes: query.genreCodes?.join(","),
    sort: query.sort,
    limit: query.limit ?? 20,
    isExclusive: query.isExclusive,
    countryOfOrigin: query.countryOfOrigin,
    publishedWithinDays: query.publishedWithinDays,
    minRating: query.minRating,
    maxMaturityRating: maxMaturityCode ?? undefined,
  };
}
