import { applyCatalogDepthPolicy, isGenreQueryRail } from './catalog-rail.policy';
import type { CatalogRailDto } from './catalog-rail.types';

const genreRail: CatalogRailDto = {
  id: 'series_drame',
  code: 'series_drame',
  title: 'Drame',
  type: 'query',
  query: { contentType: 'SERIE', genre: 'DRAME' },
};

const coreRail: CatalogRailDto = {
  id: 'series_catalog',
  code: 'series_catalog',
  title: 'Tout le catalogue',
  type: 'query',
  query: { contentType: 'SERIE', sort: 'viewCount' },
};

describe('catalog-rail.policy', () => {
  it('identifie les rails filtrés par genre', () => {
    expect(isGenreQueryRail(genreRail)).toBe(true);
    expect(isGenreQueryRail(coreRail)).toBe(false);
  });

  it('masque les rails genre si le catalogue est trop petit', () => {
    const rails = [coreRail, genreRail];
    expect(applyCatalogDepthPolicy(rails, 3)).toEqual([coreRail]);
    expect(applyCatalogDepthPolicy(rails, 12)).toEqual(rails);
  });
});
