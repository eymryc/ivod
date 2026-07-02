"use client";

import { useQuery } from "@tanstack/react-query";
import { profilesApi } from "@/lib/api/profiles";
import { resolveMaxMaturityCode } from "@/lib/utils/catalog-maturity";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useProfileStore } from "@/lib/stores/profile.store";

/** Âge max pour filtrer les listes catalogue — source : Contrôle parental du profil actif. */
export function useCatalogMaturityFilter(): string | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const { data } = useQuery({
    queryKey: ["parental-control", activeProfileId],
    queryFn: () => profilesApi.getParentalControl(activeProfileId!),
    enabled: isAuthenticated && !!activeProfileId,
    staleTime: 5 * 60_000,
  });

  return resolveMaxMaturityCode(data);
}
