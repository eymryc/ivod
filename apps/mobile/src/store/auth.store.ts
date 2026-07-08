/**
 * Store d'authentification — Zustand.
 *
 * État global de la session utilisateur.
 * Persiste les données dans :
 * - SecureStore (tokens JWT + données utilisateur — chiffrés par l'OS)
 *
 * Ce store est la seule source de vérité pour l'état d'authentification.
 * Les composants consomment ce store via le hook useAuth (presentation/hooks/use-auth.ts)
 * pour rester découplés de l'implémentation Zustand.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setTokens, clearTokens, getAccessToken } from '@/infrastructure/api/client';
import { registerDeviceOnLogin } from '@/infrastructure/services/device.service';
import { useProfileStore } from '@/store/profile.store';
import type { AuthUser } from '@/core/entities';

const USER_STORAGE_KEY = 'ivod_user';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True quand l'hydratation depuis le stockage est terminée. */
  isReady: boolean;

  /** Enregistre tokens + utilisateur après login/register réussi. */
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => Promise<void>;
  /** Met à jour les données utilisateur sans toucher aux tokens. */
  setUser: (user: AuthUser) => void;
  /** Efface tokens + utilisateur (déconnexion). */
  logout: () => Promise<void>;
  /** Recharge la session depuis le stockage persistant au démarrage. */
  loadFromStorage: () => Promise<void>;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isReady: false,

  setAuth: async (user, accessToken, refreshToken) => {
    // 1. Persistance sécurisée des tokens
    await setTokens(accessToken, refreshToken);
    // 2. Persistance des données utilisateur (chiffrées par l'OS)
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
    // 3. Mise à jour du state
    set({ user, isAuthenticated: true });
    // 4. Enregistrement de l'appareil en arrière-plan (non bloquant)
    registerDeviceOnLogin().catch(() => undefined);
  },

  setUser: (user) => {
    SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await clearTokens();
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    await useProfileStore.getState().clearProfiles();
    set({ user: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const [token, userStr] = await Promise.all([
        getAccessToken(),
        SecureStore.getItemAsync(USER_STORAGE_KEY),
      ]);

      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, isAuthenticated: true, isReady: true });
        registerDeviceOnLogin().catch(() => undefined);
        return;
      }
    } catch {
      // Session corrompue : on démarre comme déconnecté
    }
    set({ isReady: true });
  },
}));
