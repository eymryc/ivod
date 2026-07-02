"use client";
import { create } from "zustand";

interface PlayerState {
  sessionId: string | null;
  contentId: string | null;
  episodeId: string | null;
  currentPositionSec: number;
  quality: string;
  isPlaying: boolean;
  setSession: (sessionId: string, contentId: string, episodeId?: string) => void;
  setPosition: (sec: number) => void;
  setQuality: (quality: string) => void;
  setPlaying: (playing: boolean) => void;
  clearSession: () => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  sessionId: null,
  contentId: null,
  episodeId: null,
  currentPositionSec: 0,
  quality: "auto",
  isPlaying: false,

  setSession: (sessionId, contentId, episodeId) =>
    set({ sessionId, contentId, episodeId: episodeId ?? null }),
  setPosition: (sec) => set({ currentPositionSec: sec }),
  setQuality: (quality) => set({ quality }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  clearSession: () =>
    set({ sessionId: null, contentId: null, episodeId: null, currentPositionSec: 0 }),
}));
