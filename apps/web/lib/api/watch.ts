import { get, post, patch, del } from "./client";

export const watchApi = {
  startSession: (data: {
    contentId: string;
    episodeId?: string;
    deviceFingerprint?: string;
    quality?: string;
    profileId?: string;
  }) =>
    post<{ sessionId: string; id?: string; resumePositionSec?: number }>("/watch-sessions", data),
  heartbeat: (sessionId: string, data: { currentPositionSec: number; quality?: string }) =>
    patch<any>(`/watch-sessions/${sessionId}/heartbeat`, data),
  endSession: (sessionId: string, data?: { finalPositionSec?: number }) =>
    patch<any>(`/watch-sessions/${sessionId}/end`, data ?? {}),
  getActive: () => get<any[]>("/watch-sessions/active", true),
  terminateAll: () => del<any>("/watch-sessions/terminate-all"),
  getHistory: (page = 1, limit = 20) =>
    get<any>(`/watch-sessions/history?page=${page}&limit=${limit}`, true),
  getHistoryByProfile: (profileId: string, page = 1, limit = 20) =>
    get<any>(`/watch-sessions/history/profile/${profileId}?page=${page}&limit=${limit}`, true),
  clearHistory: () => del<any>("/watch-sessions/history"),
  recordQoE: (data: {
    contentId: string;
    sessionId?: string;
    episodeId?: string;
    assetId?: string;
    eventType: "startup" | "rebuffer" | "quality_change" | "error";
    payload?: Record<string, unknown>;
  }) => post<{ id: string; recorded: boolean }>("/watch-sessions/qoe", data),
};
