/**
 * Store d'authentification — Zustand avec persist localStorage.
 *
 * Stratégie de stockage (3 emplacements distincts) :
 * - accessToken  → cookie 'ivod-token' (SameSite=Strict, Secure en prod, mais NON HttpOnly
 *                  car lu par le client JS et le middleware Edge proxy.ts)
 * - refreshToken → localStorage via Zustand persist (clé 'ivod-auth')
 * - user         → localStorage via Zustand persist (clé 'ivod-auth')
 *
 * Au rehydrate (onRehydrateStorage), le cookie est lu pour restaurer l'accessToken
 * en mémoire ; syncSessionFromCookie() vérifie la fraîcheur du token.
 *
 * Helpers de rôle :
 * - isAdmin(user)   → ADMIN ou SUPER_ADMIN
 * - isCreator(user) → CREATOR
 *
 * @see lib/auth/session.ts pour la gestion des cookies
 * @see lib/auth/sync.ts pour la synchronisation cookie ↔ store
 */
"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  readAccessTokenCookie,
  setAccessTokenCookie,
} from "@/lib/auth/session";
import { syncSessionFromCookie } from "@/lib/auth/sync";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: AuthUser) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (tokens, user) => {
        setAccessTokenCookie(tokens.accessToken);
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        setAccessTokenCookie(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setAccessToken: (token) => {
        setAccessTokenCookie(token);
        set({ accessToken: token });
      },

      // L'API fait tourner (rotation) le refresh token à chaque appel
      // /auth/refresh — sans persister le nouveau ici, le prochain refresh
      // présenterait un token déjà consommé côté serveur et serait rejeté
      // comme une réutilisation (voir apps/api AuthService.refreshAccessToken).
      setRefreshToken: (token) => {
        set({ refreshToken: token });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "ivod-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user;
          const cookieToken = readAccessTokenCookie();
          if (cookieToken) {
            state.accessToken = cookieToken;
          }
        }
        queueMicrotask(() => syncSessionFromCookie());
      },
    },
  ),
);

export const isAdmin = (user: AuthUser | null) =>
  (user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPER_ADMIN")) ?? false;
export const isCreator = (user: AuthUser | null) => user?.roles?.includes("CREATOR") ?? false;

/** @deprecated Préférer `readAccessTokenCookie` depuis `@/lib/auth/session` */
export { readAccessTokenCookie } from "@/lib/auth/session";
