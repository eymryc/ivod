export type CatalogSectionConfig = {
  id: string;
  fixedContentType: string;
  title: string;
  kicker: string;
  description?: string;
};

export const CATALOG_SECTIONS: Record<string, CatalogSectionConfig> = {
  films: {
    id: "films",
    fixedContentType: "FILM",
    kicker: "Cinéma",
    title: "Films",
    description: "Longs métrages et fictions au format film.",
  },
  series: {
    id: "series",
    fixedContentType: "SERIE",
    kicker: "Séries",
    title: "Séries TV",
    description: "Séries — suivez chaque saison épisode par épisode.",
  },
  "web-series": {
    id: "web-series",
    fixedContentType: "WEB_SERIE",
    kicker: "Digital",
    title: "Web-séries",
    description: "Formats courts pensés pour le web.",
  },
  animation: {
    id: "animation",
    fixedContentType: "ANIMATION",
    kicker: "Animation",
    title: "Animation",
    description: "Films et séries d'animation.",
  },
};
