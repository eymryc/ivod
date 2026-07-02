/**
 * Hook useAuth — Interface unifiée pour les actions d'authentification.
 *
 * Abstrait le store Zustand des composants :
 * les écrans n'importent jamais directement useAuthStore.
 * Tout passe par ce hook, ce qui facilite les tests et l'évolution.
 */

import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/core/entities';

export interface UseAuthResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

/**
 * @example
 *   const { isAuthenticated, logout } = useAuth();
 */
export function useAuth(): UseAuthResult {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  return { user, isAuthenticated, isReady, setAuth, setUser, logout };
}
