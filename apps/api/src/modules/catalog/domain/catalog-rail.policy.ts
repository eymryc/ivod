import { CATALOG_GENRE_RAILS_MIN_PUBLISHED } from './catalog-rail.constants';
import type { CatalogRailDto } from './catalog-rail.types';

/** Rail de requête filtré par genre (masqué si catalogue trop petit). */
export function isGenreQueryRail(
  rail: Pick<CatalogRailDto, 'type' | 'query'>,
): boolean {
  if (rail.type !== 'query' || !rail.query) return false;
  return Boolean(rail.query.genre || rail.query.genreCodes?.length);
}

/**
 * Adapte la liste de rails à la profondeur du catalogue publié.
 * Les rails « cœur » restent ; les rails genre sont retirés si peu de titres.
 */
export function applyCatalogDepthPolicy(
  rails: CatalogRailDto[],
  publishedCount: number,
  minForGenreRails = CATALOG_GENRE_RAILS_MIN_PUBLISHED,
): CatalogRailDto[] {
  if (publishedCount >= minForGenreRails) return rails;
  return rails.filter((rail) => !isGenreQueryRail(rail));
}
