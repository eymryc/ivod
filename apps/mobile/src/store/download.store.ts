/**
 * Store des téléchargements en cours — Zustand.
 *
 * Conserve la progression hors du cycle de vie des écrans pour que
 * l'utilisateur retrouve l'état réel en revenant sur une fiche contenu.
 */

import { create } from 'zustand';

export function downloadTargetKey(contentId: string, episodeId?: string): string {
  return episodeId ? `${contentId}:${episodeId}` : contentId;
}

interface ActiveDownload {
  progress: number;
}

interface DownloadState {
  active: Record<string, ActiveDownload>;
  start: (key: string) => void;
  setProgress: (key: string, progress: number) => void;
  clear: (key: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  active: {},

  start: (key) =>
    set((state) => ({
      active: { ...state.active, [key]: { progress: 0 } },
    })),

  setProgress: (key, progress) =>
    set((state) => {
      if (!state.active[key]) return state;
      return {
        active: { ...state.active, [key]: { progress } },
      };
    }),

  clear: (key) =>
    set((state) => {
      const next = { ...state.active };
      delete next[key];
      return { active: next };
    }),
}));
