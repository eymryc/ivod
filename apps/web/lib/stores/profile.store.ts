"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  isKids: boolean;
  isDefault: boolean;
  languageCode: string | null;
  /** Indique qu'un code PIN est requis pour accéder au profil */
  hasPin?: boolean;
  /** @deprecated Utiliser hasPin — jamais renvoyé par l'API */
  requirePin?: boolean;
  pin?: string | null;
  maturityRating?: { code: string; label: string } | null;
}

interface ProfileState {
  activeProfileId: string | null;
  profiles: Profile[];
  setActiveProfile: (id: string) => void;
  setProfiles: (profiles: Profile[]) => void;
  getActiveProfile: () => Profile | null;
  clearProfiles: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      activeProfileId: null,
      profiles: [],

      setActiveProfile: (id) => set({ activeProfileId: id }),

      setProfiles: (profiles) => {
        const defaultProfile = profiles.find((p) => p.isDefault);
        set({ profiles, activeProfileId: get().activeProfileId ?? defaultProfile?.id ?? null });
      },

      getActiveProfile: () => {
        const { activeProfileId, profiles } = get();
        return profiles.find((p) => p.id === activeProfileId) ?? null;
      },

      clearProfiles: () => set({ activeProfileId: null, profiles: [] }),
    }),
    {
      name: "ivod-profile",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
