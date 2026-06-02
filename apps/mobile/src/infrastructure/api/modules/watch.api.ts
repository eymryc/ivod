/**
 * Module API — Sessions de visionnage & historique (aligné web watchApi).
 */

import { api, buildQueryString } from '../client';
import type { WatchSession, WatchHistoryEntry } from '@/core/entities';

export interface WatchHistoryResult {
  items: WatchHistoryEntry[];
  total?: number;
}

export const watchApi = {
  startSession: (data: {
    contentId: string;
    episodeId?: string;
    profileId?: string;
    quality?: string;
    deviceFingerprint?: string;
  }): Promise<WatchSession & { sessionId?: string }> =>
    api.post<WatchSession & { sessionId?: string }>('/watch-sessions', data),

  heartbeat: (sessionId: string, data: { currentPositionSec: number; quality?: string }) =>
    api.patch(`/watch-sessions/${sessionId}/heartbeat`, data),

  endSession: (sessionId: string, data?: { finalPositionSec?: number }) =>
    api.patch(`/watch-sessions/${sessionId}/end`, data ?? {}),

  getActive: () => api.get<unknown[]>('/watch-sessions/active'),

  terminateAll: () => api.delete('/watch-sessions/terminate-all'),

  getHistory: (profileId?: string, page = 1, limit = 20): Promise<WatchHistoryResult> => {
    if (profileId) {
      return api.get<WatchHistoryResult>(
        `/watch-sessions/history/profile/${profileId}${buildQueryString({ page, limit })}`,
      );
    }
    return api.get<WatchHistoryResult>(
      `/watch-sessions/history${buildQueryString({ page, limit })}`,
    );
  },

  clearHistory: () => api.delete('/watch-sessions/history'),
};
