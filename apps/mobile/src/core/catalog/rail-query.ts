import type { CatalogRailQuery } from '@/infrastructure/api/modules/catalog.api';
import type { ContentListParams } from '@/infrastructure/api/modules/content.api';

/** Mappe une requête rail → paramètres GET /contents (parité web). */
export function railToListParams(
  query: CatalogRailQuery | undefined,
  maxMaturityCode?: string | null,
): ContentListParams {
  if (!query) return { limit: 20, maxMaturityRating: maxMaturityCode ?? undefined };

  return {
    contentType: query.contentType,
    genre: query.genre,
    genreCodes: query.genreCodes?.join(','),
    sort: query.sort,
    limit: query.limit ?? 20,
    isExclusive: query.isExclusive,
    countryOfOrigin: query.countryOfOrigin,
    publishedWithinDays: query.publishedWithinDays,
    minRating: query.minRating,
    maxMaturityRating: maxMaturityCode ?? undefined,
  };
}
