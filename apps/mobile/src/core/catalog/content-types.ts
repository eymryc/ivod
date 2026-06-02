import type { CatalogSectionConfig } from '@/core/catalog/sections';

/** Référentiel type de contenu (API /content-types ou /references) */
export type ContentTypeRef = {
  id?: string;
  code: string;
  label: string;
  typeCode?: string;
};

/** Slug route catalogue ↔ code base */
export const CONTENT_TYPE_SLUG: Record<string, string> = {
  FILM: "films",
  SERIE: "series",
  WEB_SERIE: "web-series",
  ANIMATION: "animation",
  SHORT: "shorts",
};

const SLUG_TO_CODE = Object.fromEntries(
  Object.entries(CONTENT_TYPE_SLUG).map(([code, slug]) => [slug, code]),
) as Record<string, string>;

/** Métadonnées éditoriales (kicker / description) — le libellé vient de la BDD */
const CATALOG_EDITORIAL: Partial<
  Record<string, Pick<CatalogSectionConfig, "kicker" | "description">>
> = {
  FILM: {
    kicker: "Cinéma",
    description: "Longs métrages et fictions au format film.",
  },
  SERIE: {
    kicker: "Séries",
    description: "Séries — suivez chaque saison épisode par épisode.",
  },
  WEB_SERIE: {
    kicker: "Digital",
    description: "Formats courts pensés pour le web.",
  },
  ANIMATION: {
    kicker: "Animation",
    description: "Films et séries d'animation.",
  },
  SHORT: {
    kicker: "Court",
    description: "Courts métrages et formats brefs.",
  },
};

/** Fallback si l’API est indisponible */
export const FALLBACK_CONTENT_TYPES: ContentTypeRef[] = [
  { code: "FILM", label: "Film", typeCode: "FILM" },
  { code: "SERIE", label: "Série", typeCode: "SERIE" },
  { code: "WEB_SERIE", label: "Série web", typeCode: "WEB_SERIE" },
  { code: "ANIMATION", label: "Animation", typeCode: "ANIMATION" },
];

export function contentTypeToSlug(code: string): string | undefined {
  return CONTENT_TYPE_SLUG[code];
}

export function slugToContentTypeCode(slug: string): string | undefined {
  return SLUG_TO_CODE[slug];
}

export function buildCatalogSections(
  types: ContentTypeRef[],
): Record<string, CatalogSectionConfig> {
  const out: Record<string, CatalogSectionConfig> = {};
  for (const t of types) {
    const slug = contentTypeToSlug(t.code);
    if (!slug) continue;
    const editorial = CATALOG_EDITORIAL[t.code];
    out[slug] = {
      id: slug,
      fixedContentType: t.code,
      title: t.label,
      kicker: editorial?.kicker ?? t.label,
      description: editorial?.description,
    };
  }
  return out;
}

export function buildTypeLabelMap(types: ContentTypeRef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of types) {
    map.set(t.code, t.label);
    if (t.typeCode) map.set(t.typeCode, t.label);
  }
  return map;
}

export function getTypeLabel(
  code: string | undefined,
  labelMap: Map<string, string>,
): string | undefined {
  if (!code) return undefined;
  return labelMap.get(code) ?? code;
}

/** Liens navigation catalogue pour l’accueil */
export function buildCatalogNavLinks(types: ContentTypeRef[]) {
  return types
    .map((t) => {
      const slug = contentTypeToSlug(t.code);
      if (!slug) return null;
      return { label: t.label, href: `/catalog/${slug}` as const };
    })
    .filter(Boolean) as { label: string; href: string }[];
}
