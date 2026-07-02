import type { CatalogRailSurface } from "@/lib/api/catalog";

/** Surfaces des pages catalogue dédiées (aligné API `DEDICATED_CATALOG_SURFACES`). */
export const DEDICATED_CATALOG_SURFACES = [
  "films",
  "series",
  "web-series",
  "animation",
] as const satisfies readonly CatalogRailSurface[];

export type DedicatedCatalogSurface = (typeof DEDICATED_CATALOG_SURFACES)[number];

export function isDedicatedCatalogSurface(
  id: string,
): id is DedicatedCatalogSurface {
  return (DEDICATED_CATALOG_SURFACES as readonly string[]).includes(id);
}
