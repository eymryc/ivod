/** Bannière hero des pages catalogue dédiées (films, séries, etc.) */
export const CATALOG_PAGE_HERO_CLASS =
  "relative w-full min-h-[min(42vh,320px)] md:min-h-[min(48vh,400px)] max-h-[min(58vh,560px)] overflow-hidden";

/** Hero avec titre « À la une » — plus haut, rendu showcase */
export const CATALOG_PAGE_HERO_SHOWCASE_CLASS =
  "catalog-page-hero--showcase relative w-full min-h-[min(68vh,480px)] md:min-h-[min(72vh,560px)] lg:min-h-[min(74vh,620px)] max-h-[min(88vh,720px)] overflow-hidden";

/** BA / teaser : cadre 16:9 dédié — évite le rognage object-cover dans un hero trop haut ou trop large */
export const CATALOG_PAGE_HERO_WITH_TRAILER_CLASS = "catalog-page-hero--with-trailer";
