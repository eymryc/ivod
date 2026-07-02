/** Surfaces d'affichage des rails catalogue. */
export type CatalogRailSurface =
  | 'home'
  | 'films'
  | 'series'
  | 'web-series'
  | 'animation';

/** Source de données du rail. */
export type CatalogRailType = 'query' | 'personalized' | 'editorial';

/** Rails personnalisés (profil / auth). */
export type CatalogRailPersonalizedKind =
  | 'continue_watching'
  | 'resume_tonight'
  | 'unfinished'
  | 'my_list'
  | 'recommendations';

/** Format d'affichage du titre sur les pages catalogue dédiées. */
export type CatalogRailTitleMode = 'plain' | 'with-section';

/** Critères de requête catalogue (mappés sur GET /contents). */
export type CatalogRailQuery = {
  contentType?: string;
  genre?: string;
  /** Plusieurs genres fusionnés (OR). */
  genreCodes?: string[];
  sort?: 'publishedAt' | 'viewCount' | 'averageRating';
  limit?: number;
  isExclusive?: boolean;
  countryOfOrigin?: string;
  publishedWithinDays?: number;
  minRating?: number;
};

/** Définition statique d'un rail — registre central. */
export type CatalogRailDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  surfaces: CatalogRailSurface[];
  type: CatalogRailType;
  personalizedKind?: CatalogRailPersonalizedKind;
  requiresAuth?: boolean;
  hideIfEmpty?: boolean;
  query?: CatalogRailQuery;
  /** Lien « Voir tout » (chemin relatif web). */
  link?: string;
  titleMode?: CatalogRailTitleMode;
};

/** Rail résolu pour le client (titre final + métadonnées). */
export type CatalogRailDto = {
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
  /** Contenus curés (type editorial), ordre préservé. */
  contentIds?: string[];
};
