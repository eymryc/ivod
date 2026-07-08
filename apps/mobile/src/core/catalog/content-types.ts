import type { CatalogSectionConfig } from '@/core/catalog/sections';

/** Référentiel type de contenu (API /content-types ou /references) */
export type ContentTypeRef = {
  id?: string;
  code: string;
  label: string;
  typeCode?: string;
};

/**
 * Slug route catalogue ↔ code base — un type sans entrée ici n'a ni pastille
 * de nav ni page dédiée (voir buildCatalogNavLinks/buildCatalogSections).
 * SHORT et DOCUMENTAIRE volontairement absents : pas encore de contenu de
 * ces types au catalogue, pas de page dédiée tant que ce n'est pas le cas.
 */
export const CONTENT_TYPE_SLUG: Record<string, string> = {
  FILM: "films",
  SERIE: "series",
  WEB_SERIE: "web-series",
  ANIMATION: "animation",
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
      return { label: t.label, href: `/(tabs)/catalog/${slug}` as const };
    })
    .filter(Boolean) as { label: string; href: string }[];
}

/** Résout une section catalogue depuis un slug (`films`) ou un code API (`FILM`). */
export function resolveCatalogSection(
  typeParam: string | undefined,
  dynamicSections: Record<string, CatalogSectionConfig>,
  staticSections: Record<string, CatalogSectionConfig>,
): CatalogSectionConfig | undefined {
  if (!typeParam) return undefined;

  const direct = dynamicSections[typeParam] ?? staticSections[typeParam];
  if (direct) return direct;

  const upper = typeParam.toUpperCase();
  const slugFromCode = contentTypeToSlug(upper);
  if (slugFromCode) {
    return dynamicSections[slugFromCode] ?? staticSections[slugFromCode];
  }

  const codeFromSlug = slugToContentTypeCode(typeParam);
  if (codeFromSlug) {
    const slug = contentTypeToSlug(codeFromSlug);
    if (slug) return dynamicSections[slug] ?? staticSections[slug];
  }

  return undefined;
}
