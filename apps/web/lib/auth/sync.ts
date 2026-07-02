import { readAccessTokenCookie } from "./session";
import { useAuthStore } from "@/lib/stores/auth.store";

/**
 * Aligne le store Zustand avec le cookie JWT (après rechargement ou onglet ouvert).
 * À appeler au boot et après rehydrate persist.
 */
export function syncSessionFromCookie(): void {
  if (typeof window === "undefined") return;

  const token = readAccessTokenCookie();
  const state = useAuthStore.getState();

  if (!state.user) return;

  if (!state.isAuthenticated) {
    useAuthStore.setState({ isAuthenticated: true });
  }

  if (token && state.accessToken !== token) {
    state.setAccessToken(token);
  }
}
