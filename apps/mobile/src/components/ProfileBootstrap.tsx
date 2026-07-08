import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/infrastructure/api';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore, type Profile } from '@/store/profile.store';
import { invalidateProfileScopedQueries } from '@/core/constants/invalidate-profile-queries';

/**
 * Charge la liste des profils au démarrage et invalide le cache profil-scopé
 * une fois l'hydratation terminée (évite les données du profil par défaut).
 */
export function ProfileBootstrap() {
  const qc = useQueryClient();
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useProfileStore((s) => s.hydrated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const setProfiles = useProfileStore((s) => s.setProfiles);

  const profilesLoadedRef = useRef(false);
  const cacheSyncedRef = useRef(false);

  useEffect(() => {
    if (!isReady || !hydrated || !isAuthenticated) return;
    if (profilesLoadedRef.current) return;
    profilesLoadedRef.current = true;

    void profilesApi.list().then((profiles) => {
      setProfiles(profiles as Profile[]);
    });
  }, [isReady, hydrated, isAuthenticated, setProfiles]);

  useEffect(() => {
    if (!isReady || !hydrated || !isAuthenticated || !profileId) return;
    if (cacheSyncedRef.current) return;
    cacheSyncedRef.current = true;
    void invalidateProfileScopedQueries(qc);
  }, [isReady, hydrated, isAuthenticated, profileId, qc]);

  return null;
}
