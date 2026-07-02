import type { CatalogRailSurface } from './catalog-rail.types';

/** Surfaces des pages catalogue dédiées (hors accueil). */
export const DEDICATED_CATALOG_SURFACES = [
  'films',
  'series',
  'web-series',
  'animation',
] as const satisfies readonly CatalogRailSurface[];

export type DedicatedCatalogSurface = (typeof DEDICATED_CATALOG_SURFACES)[number];

/** Type de contenu API associé à chaque surface dédiée. */
export const CATALOG_SURFACE_CONTENT_TYPE: Record<DedicatedCatalogSurface, string> = {
  films: 'FILM',
  series: 'SERIE',
  'web-series': 'WEB_SERIE',
  animation: 'ANIMATION',
};

/**
 * Nombre minimum de titres publiés pour afficher les rails par genre.
 * En dessous : rails « cœur » uniquement (tout le catalogue, spotlight, nouveautés).
 */
export const CATALOG_GENRE_RAILS_MIN_PUBLISHED = 12;

export function isDedicatedCatalogSurface(
  surface: CatalogRailSurface,
): surface is DedicatedCatalogSurface {
  return (DEDICATED_CATALOG_SURFACES as readonly string[]).includes(surface);
}
