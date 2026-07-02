"use client";

import { create } from "zustand";

export type DownloadJobPhase =
  | "idle"
  | "rights"
  | "registering"
  | "packaging"
  | "complete"
  | "error";

export type DownloadJob = {
  key: string;
  contentId: string;
  episodeId?: string;
  title: string;
  posterUrl?: string | null;
  progress: number;
  phase: DownloadJobPhase;
  phaseLabel: string;
  error?: string;
  startedAt: number;
};

type DownloadProgressState = {
  jobs: Record<string, DownloadJob>;
  startJob: (job: Omit<DownloadJob, "progress" | "phase" | "phaseLabel" | "startedAt">) => void;
  updateJob: (key: string, patch: Partial<DownloadJob>) => void;
  completeJob: (key: string) => void;
  failJob: (key: string, error: string) => void;
  removeJob: (key: string) => void;
  getActiveJobs: () => DownloadJob[];
};

export function downloadJobKey(contentId: string, episodeId?: string) {
  return episodeId ? `${contentId}:${episodeId}` : contentId;
}

export const useDownloadProgressStore = create<DownloadProgressState>((set, get) => ({
  jobs: {},

  startJob: (job) => {
    const full: DownloadJob = {
      ...job,
      progress: 0,
      phase: "rights",
      phaseLabel: "Vérification des droits…",
      startedAt: Date.now(),
    };
    set((s) => ({ jobs: { ...s.jobs, [job.key]: full } }));
  },

  updateJob: (key, patch) => {
    set((s) => {
      const prev = s.jobs[key];
      if (!prev) return s;
      return { jobs: { ...s.jobs, [key]: { ...prev, ...patch } } };
    });
  },

  completeJob: (key) => {
    set((s) => {
      const prev = s.jobs[key];
      if (!prev) return s;
      return {
        jobs: {
          ...s.jobs,
          [key]: {
            ...prev,
            progress: 100,
            phase: "complete",
            phaseLabel: "Téléchargement enregistré",
          },
        },
      };
    });
    setTimeout(() => {
      get().removeJob(key);
    }, 4000);
  },

  failJob: (key, error) => {
    set((s) => {
      const prev = s.jobs[key];
      if (!prev) return s;
      return {
        jobs: {
          ...s.jobs,
          [key]: { ...prev, phase: "error", phaseLabel: "Échec", error, progress: 0 },
        },
      };
    });
    setTimeout(() => {
      get().removeJob(key);
    }, 5000);
  },

  removeJob: (key) => {
    set((s) => {
      const next = { ...s.jobs };
      delete next[key];
      return { jobs: next };
    });
  },

  getActiveJobs: () => {
    const jobs = Object.values(get().jobs);
    return jobs.filter((j) => j.phase !== "complete" && j.phase !== "error");
  },
}));
