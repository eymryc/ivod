import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';

/**
 * Indique si le profil actif est prêt pour les requêtes profil-dépendantes.
 * Évite les appels API sans profileId (fallback serveur = profil par défaut).
 */
export function useProfileReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useProfileStore((s) => s.hydrated);
  const profileId = useProfileStore((s) => s.activeProfileId);

  const isProfileReady = !isAuthenticated || (hydrated && !!profileId);

  return { profileId, isProfileReady, hydrated, isAuthenticated };
}
