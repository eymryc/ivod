export type CatalogLayout = "grid" | "genre-rows";

export type CatalogSectionConfig = {
  id: string;
  basePath: string;
  /** Correspondance navbar (`matchType`) */
  navMatchType: string | null;
  /** Type API verrouillé (page dédiée) */
  fixedContentType?: string;
  /** `genre-rows` = rails par genre (ex. « Action – Films ») */
  catalogLayout?: CatalogLayout;
  kicker: string;
  title: string;
  description?: string;
  emptyDescription?: string;
  /** Masque la nav secondaire Films / Séries / Web-séries dans le hero */
  hideCategoryNav?: boolean;
};

export const FILMS_SECTION: CatalogSectionConfig = {
  id: "films",
  basePath: "/films",
  navMatchType: "FILM",
  fixedContentType: "FILM",
  hideCategoryNav: true,
  catalogLayout: "genre-rows",
  kicker: "Cinéma",
  title: "Films",
  description: "Longs métrages, courts et fictions au format film.",
};

export const SERIES_SECTION: CatalogSectionConfig = {
  id: "series",
  basePath: "/series",
  navMatchType: "SERIE",
  fixedContentType: "SERIE",
  hideCategoryNav: true,
  catalogLayout: "genre-rows",
  kicker: "Séries",
  title: "Séries TV",
  description:
    "Séries africaines et internationales — suivez chaque saison épisode par épisode.",
  emptyDescription:
    "Aucune série publiée pour le moment. Revenez bientôt ou explorez les films et web-séries.",
};

export const WEB_SERIES_SECTION: CatalogSectionConfig = {
  id: "web-series",
  basePath: "/web-series",
  navMatchType: "WEB_SERIE",
  fixedContentType: "WEB_SERIE",
  hideCategoryNav: true,
  catalogLayout: "genre-rows",
  kicker: "Digital",
  title: "Web-séries",
  description: "Fictions et formats courts pensés pour le web.",
  emptyDescription:
    "Aucune web-série publiée pour le moment. Explorez les films et séries du catalogue.",
};

export const ANIMATION_SECTION: CatalogSectionConfig = {
  id: "animation",
  basePath: "/animation",
  navMatchType: "ANIMATION",
  fixedContentType: "ANIMATION",
  hideCategoryNav: true,
  catalogLayout: "genre-rows",
  kicker: "Animation",
  title: "Animation",
  description: "Films et séries d'animation pour tous les âges.",
  emptyDescription:
    "Aucun titre d'animation publié pour le moment. Explorez les films et séries du catalogue.",
};

/** Anciennes URLs `/browse?type=…` → pages dédiées */
export const TYPE_TO_SECTION_PATH: Record<string, string> = {
  FILM: "/films",
  SERIE: "/series",
  WEB_SERIE: "/web-series",
  ANIMATION: "/animation",
};

export const DEDICATED_CATALOG_SECTIONS = [
  FILMS_SECTION,
  SERIES_SECTION,
  WEB_SERIES_SECTION,
  ANIMATION_SECTION,
] as const;
