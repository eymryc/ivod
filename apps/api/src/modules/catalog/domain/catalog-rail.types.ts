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
  /** Année de sortie minimale (ex. rail « Films des années 90 » → 1990). */
  releaseYearFrom?: number;
  /** Année de sortie maximale (ex. rail « Films des années 90 » → 1999). */
  releaseYearTo?: number;
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
  /** Codes ref_user_plans autorisés — vide = tous les plans. */
  targetPlanCodes?: string[];
  /** Codes ISO pays autorisés — vide = tous les pays. */
  targetCountryCodes?: string[];
};

/**
 * DTO d'un rail dont les contenus ont déjà été résolus côté serveur —
 * évite au client un aller-retour /contents séparé par rail.
 * `items` n'est peuplé que pour les rails `query`/`editorial` ; les rails
 * `personalized` restent à la charge du client (dépendent du profil actif).
 */
export type ResolvedCatalogRailDto = CatalogRailDto & {
  items: unknown[];
};
