import type { QueryClient } from "@tanstack/react-query";
import type { ResolvedCatalogRail } from "@/lib/api/catalog";
import { serverFetchContent } from "@/lib/api/server-fetch";

/**
 * Prefetch SSR de la homepage — un seul appel /catalog/rails/resolved au lieu
 * d'un appel /catalog/rails + un GET /contents par rail. Le filtre de
 * maturité (contrôle parental) dépend du profil actif, connu seulement côté
 * client (store Zustand) : le SSR prefetch n'applique donc aucun filtre —
 * un visiteur avec un profil restreint reverra un fetch client (non-SSR)
 * avec le bon filtre au premier rendu, comme avant ce changement.
 */
export async function prefetchHomeCatalog(queryClient: QueryClient) {
  const surface = "home" as const;
  const maturity = null;

  await queryClient.prefetchQuery({
    queryKey: ["catalog-rails-resolved", surface, maturity],
    queryFn: () =>
      serverFetchContent<ResolvedCatalogRail[]>(`/catalog/rails/resolved?surface=${surface}`),
  });
}
