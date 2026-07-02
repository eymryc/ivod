import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/infrastructure/api';
import { QueryKeys } from '@/core/constants/query-keys';
import { resolveMaxMaturityCode } from '@/presentation/utils/parental';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';

/**
 * Âge max pour filtrer les listes catalogue (rails, recherche, browse).
 * Même règle que le web : réglage « Contrôle parental » du profil actif.
 * Retourne `null` = pas de filtre (tous publics ou non connecté).
 */
export function useCatalogMaturityFilter(): string | null {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);

  const { data } = useQuery({
    queryKey: QueryKeys.profiles.parental(profileId ?? ''),
    queryFn: () => profileApi.getParentalControl(profileId!),
    enabled: isAuth && !!profileId,
    staleTime: 5 * 60_000,
  });

  return resolveMaxMaturityCode(data);
}
