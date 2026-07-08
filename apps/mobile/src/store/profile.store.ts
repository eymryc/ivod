/**
 * Store de profils — Zustand.
 *
 * Gère le profil actif de l'utilisateur dans le système multi-profils.
 * Persiste l'ID du profil actif dans AsyncStorage entre les sessions.
 *
 * Les composants consomment ce store via le hook useProfile
 * (ou directement via useProfileStore si le hook n'est pas nécessaire).
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '@/core/entities';

// Ré-exporté pour la compatibilité avec les écrans qui importent Profile depuis ce module
export type { Profile };

const ACTIVE_PROFILE_KEY = 'ivod_active_profile';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  /** True quand l'hydratation depuis AsyncStorage est terminée. */
  hydrated: boolean;

  /** Remplace la liste de profils et sélectionne le profil par défaut si nécessaire. */
  setProfiles: (profiles: Profile[]) => void;
  /** Définit le profil actif et persiste le choix. */
  setActiveProfile: (id: string) => Promise<void>;
  /** Retourne le profil actif complet, ou null. */
  getActiveProfile: () => Profile | null;
  /** Efface tous les profils (utilisé lors du logout). */
  clearProfiles: () => Promise<void>;
  /** Recharge le profil actif depuis AsyncStorage au démarrage. */
  hydrate: () => Promise<void>;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  hydrated: false,

  setProfiles: (profiles) => {
    const { activeProfileId: currentId, hydrated } = get();
    const isCurrentValid = !!currentId && profiles.some((p) => p.id === currentId);
    const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];

    let nextActiveId = currentId;
    if (isCurrentValid) {
      // conserve le profil actif persisté
    } else if (currentId != null) {
      // profil supprimé ou invalide
      nextActiveId = defaultProfile?.id ?? null;
    } else if (hydrated) {
      // pas de profil stocké : défaut uniquement après hydratation
      nextActiveId = defaultProfile?.id ?? null;
    }

    set({ profiles, activeProfileId: nextActiveId });

    if (nextActiveId && nextActiveId !== currentId) {
      void AsyncStorage.setItem(ACTIVE_PROFILE_KEY, nextActiveId);
    }
  },

  setActiveProfile: async (id) => {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
    set({ activeProfileId: id });
  },

  getActiveProfile: () => {
    const { activeProfileId, profiles } = get();
    return profiles.find((p) => p.id === activeProfileId) ?? null;
  },

  clearProfiles: async () => {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    set({ profiles: [], activeProfileId: null });
  },

  hydrate: async () => {
    try {
      const id = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
      if (id) set({ activeProfileId: id });
    } catch {
      // Hydratation échouée : on continue sans profil actif
    }
    set({ hydrated: true });
  },
}));
