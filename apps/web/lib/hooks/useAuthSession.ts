"use client";

import { useAuthStore } from "@/lib/stores/auth.store";
import { useAuthHydrated } from "@/lib/hooks/useAuthHydrated";

/**
 * État auth prêt pour l'UI (queries, guards).
 * Ne pas utiliser `accessToken` du store pour `enabled` — préférer `hasSession`.
 * Les appels API passent par `privateFetch` qui lit le cookie.
 */
export function useAuthSession() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  return {
    hydrated,
    /** Store restauré depuis localStorage */
    isReady: hydrated,
    /** Utilisateur connecté (profil persisté) */
    isAuthenticated,
    /** Prêt pour requêtes authentifiées côté client */
    hasSession: hydrated && isAuthenticated,
    user,
  };
}
