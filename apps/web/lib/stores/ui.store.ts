"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  theme: "dark" | "light";
  dataSaver: boolean;       // Fix 23 — mode économie de données
  preferredQuality: string; // Fix 23 — qualité vidéo mémorisée
  detectedCountry: string; // défaut CI — bannières géo ; surcharge possible via setDetectedCountry
  setSidebarOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setDataSaver: (enabled: boolean) => void;
  setPreferredQuality: (quality: string) => void;
  setDetectedCountry: (country: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      activeModal: null,
      theme: "dark",
      dataSaver: false,
      preferredQuality: "auto",
      detectedCountry: "CI",

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),
      setTheme: (theme) => set({ theme }),
      setDataSaver: (enabled) => set({ dataSaver: enabled, preferredQuality: enabled ? "480p" : "auto" }),
      setPreferredQuality: (quality) => set({ preferredQuality: quality }),
      setDetectedCountry: (country) => set({ detectedCountry: country }),
    }),
    {
      name: "ivod-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        dataSaver: state.dataSaver,
        preferredQuality: state.preferredQuality,
        detectedCountry: state.detectedCountry,
      }),
    }
  )
);
