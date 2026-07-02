import { useQuery } from "@tanstack/react-query";
import { referencesApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import {
  FALLBACK_CONTENT_TYPES,
  buildCatalogNavLinks,
  buildCatalogSections,
  buildTypeLabelMap,
  type ContentTypeRef,
} from "@/core/catalog/content-types";

function normalizeTypes(raw: unknown): ContentTypeRef[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const t = item as ContentTypeRef;
      if (!t?.code || !t?.label) return null;
      return {
        id: t.id,
        code: t.code,
        label: t.label,
        typeCode: t.typeCode ?? t.code,
      };
    })
    .filter(Boolean) as ContentTypeRef[];
}

export function useContentTypes() {
  const query = useQuery({
    queryKey: QueryKeys.references.contentTypes(),
    queryFn: async () => {
      try {
        return await referencesApi.listContentTypes();
      } catch {
        const all = await referencesApi.listAll().catch(() => null);
        const fromAll = (all as { contentTypes?: unknown[] } | null)?.contentTypes;
        if (fromAll?.length) return fromAll;
        throw new Error("content-types unavailable");
      }
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const types = normalizeTypes(query.data);
  const resolved = types.length > 0 ? types : FALLBACK_CONTENT_TYPES;

  return {
    types: resolved,
    labelMap: buildTypeLabelMap(resolved),
    catalogSections: buildCatalogSections(resolved),
    catalogNavLinks: buildCatalogNavLinks(resolved),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
