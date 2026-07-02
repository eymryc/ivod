import { slugToContentTypeCode } from '@/core/catalog/content-types';

const SURFACE_CATALOG_ROUTE: Record<string, string> = {
  films: '/catalog/films',
  series: '/catalog/series',
  'web-series': '/catalog/web-series',
  animation: '/catalog/animation',
};

const BROWSE_FILTER_KEYS = ['genre', 'sort', 'country', 'year', 'minRating', 'search'] as const;

/** Convertit un lien web (`/films?genre=ACTION`) en route Expo Router. */
export function railLinkToMobileHref(link?: string): string | undefined {
  if (!link?.startsWith('/')) return undefined;

  if (link === '/recommendations') return '/recommendations';
  if (link === '/browse') return '/browse';

  const qIndex = link.indexOf('?');
  const path = qIndex === -1 ? link : link.slice(0, qIndex);
  const queryString = qIndex === -1 ? '' : link.slice(qIndex + 1);
  const params = new URLSearchParams(queryString);
  const surface = path.slice(1);

  const catalogRoute = SURFACE_CATALOG_ROUTE[surface];
  if (!catalogRoute) return undefined;

  const hasBrowseFilters = BROWSE_FILTER_KEYS.some((key) => params.has(key));
  if (!hasBrowseFilters) return catalogRoute;

  const browse = new URLSearchParams();
  const contentType = slugToContentTypeCode(surface);
  if (contentType) browse.set('type', contentType);
  if (params.get('genre')) browse.set('genre', params.get('genre')!);
  if (params.get('sort')) browse.set('sort', params.get('sort')!);
  if (params.get('country')) browse.set('country', params.get('country')!);
  if (params.get('year')) browse.set('year', params.get('year')!);
  if (params.get('minRating')) browse.set('minRating', params.get('minRating')!);
  if (params.get('search')) browse.set('search', params.get('search')!);

  const qs = browse.toString();
  return qs ? `/browse?${qs}` : '/browse';
}
