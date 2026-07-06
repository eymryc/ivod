import type { QueryClient } from "@tanstack/react-query";
import type { CatalogRail } from "@/lib/api/catalog";
import { railQueryToListParams } from "@/lib/catalog/rail-query";
import { SSR_HOME_RAIL_PREFETCH_LIMIT } from "@/lib/catalog/home-rails.constants";
import { serverFetchContent } from "@/lib/api/server-fetch";

function buildContentsPath(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `/contents?${s}` : "/contents";
}

async function fetchRailItems(rail: CatalogRail) {
  if (rail.type === "editorial" && rail.contentIds?.length) {
    return serverFetchContent<{ items?: unknown[] }>(
      buildContentsPath({ ids: rail.contentIds.join(","), limit: rail.contentIds.length }),
    );
  }
  if (rail.type === "query" && rail.query) {
    return serverFetchContent<{ items?: unknown[] }>(
      buildContentsPath(railQueryToListParams(rail.query, null)),
    );
  }
  return null;
}

/** Prefetch config rails + contenu des premiers rails query/editorial (SSR accueil). */
export async function prefetchHomeCatalog(queryClient: QueryClient) {
  const surface = "home" as const;

  await queryClient.prefetchQuery({
    queryKey: ["catalog-rails", surface],
    queryFn: () => serverFetchContent<CatalogRail[]>(`/catalog/rails?surface=${surface}`),
  });

  const rails = queryClient.getQueryData<CatalogRail[]>(["catalog-rails", surface]) ?? [];
  const fetchable = rails.filter(
    (r) => r.type === "query" || (r.type === "editorial" && (r.contentIds?.length ?? 0) > 0),
  );

  await Promise.all(
    fetchable.slice(0, SSR_HOME_RAIL_PREFETCH_LIMIT).map(async (rail) => {
      await queryClient.prefetchQuery({
        queryKey: [
          "catalog-rail-content",
          surface,
          rail.id,
          rail.type,
          rail.query,
          rail.contentIds,
          null,
          undefined,
        ],
        queryFn: () => fetchRailItems(rail),
      });
    }),
  );
}
