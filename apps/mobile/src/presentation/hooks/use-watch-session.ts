/**
 * Hook useWatchSession — Gestion complète d'une session de lecture.
 * Parité web : session, heartbeat, parental, limite écrans, QoE, épisode suivant.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { contentApi } from '@/infrastructure/api/modules/content.api';
import { videoApi, type StreamInfo } from '@/infrastructure/api/modules/video.api';
import { adApi } from '@/infrastructure/api/modules/ad.api';
import { watchApi } from '@/infrastructure/api/modules/watch.api';
import { profileApi } from '@/infrastructure/api/modules/profile.api';
import { subscriptionApi } from '@/infrastructure/api/modules/subscription.api';
import { getOfflineByContentId } from '@/infrastructure/services/offline.service';
import { getOfflinePlaybackUri, isOfflineItemExpired } from '@/core/entities';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import {
  isHourRestricted,
  isMaturityBlocked,
  resolveMaxMaturityCode,
} from '@/presentation/utils/parental';
import { resolveNextEpisode } from '@/presentation/utils/series-play';
import type { Ad, Content } from '@/core/entities';
import type { Season } from '@/core/entities';

export interface NextEpisodeInfo {
  id: string;
  title: string;
  episodeNumber: number;
}

export interface UseWatchSessionResult {
  content: Content | undefined;
  stream: StreamInfo | undefined;
  playbackUrl: string | undefined;
  currentAd: Ad | null;
  isOffline: boolean;
  isAdDone: boolean;
  isPinVerified: boolean;
  showPinModal: boolean;
  pinError: string | null;
  startPosition: number;
  isStreamLoading: boolean;
  isReady: boolean;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  screenLimitExceeded: boolean;
  maxScreens: number;
  planCode: string;
  parentalBlocked: boolean;
  isTimeRestricted: boolean;
  isMaturityRestricted: boolean;
  requirePin: boolean;
  nextEpisode: NextEpisodeInfo | null;
  showNextEpisode: boolean;
  dismissNextEpisode: () => void;
  activeProfileName: string;
  activeProfileId: string | null;
  onAdComplete: () => void;
  onPinVerified: () => void;
  onPinError: (msg: string | null) => void;
  onProgressUpdate: (seconds: number) => void;
  onEnded: () => void;
  terminateAllSessions: () => void;
  isTerminating: boolean;
  /** Termine proprement la session avant de quitter l'écran. */
  exitPlayback: () => void;
  recordQoE: (
    eventType: 'startup' | 'rebuffer' | 'quality_change' | 'error',
    payload?: Record<string, unknown>,
  ) => void;
  sessionId: string | null;
  staffReview: boolean;
  isDraftPreview: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

function resolveSessionId(session: { id?: string; sessionId?: string }): string | null {
  return session.sessionId ?? session.id ?? null;
}

function appendPlaybackToken(url: string, token?: string): string {
  if (!token || url.includes('token=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export interface UseWatchSessionOptions {
  /** Mode revue staff (admin + ?review=1) — bypass parental, pubs, limite écrans. */
  staffReview?: boolean;
  /** Position explicite (deep link ?t=) — prioritaire sur l'historique serveur. */
  initialTimeSec?: number;
}

function resolveContentStatusCode(content: Content | undefined): string | undefined {
  if (!content?.status) return undefined;
  return typeof content.status === 'string' ? content.status : content.status.code;
}

export function useWatchSession(
  contentId: string | undefined,
  episodeId: string | undefined,
  options: UseWatchSessionOptions = {},
): UseWatchSessionResult {
  const { staffReview = false, initialTimeSec } = options;
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const activeProfile = useProfileStore((s) => s.getActiveProfile());

  const sessionIdRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [offlineUri, setOfflineUri] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [isAdDone, setIsAdDone] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [startPosition, setStartPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);

  useEffect(() => {
    if (!contentId) return;
    getOfflineByContentId(contentId, episodeId).then((item) => {
      if (!item || isOfflineItemExpired(item)) return;
      const uri = getOfflinePlaybackUri(item);
      if (uri) {
        setOfflineUri(uri);
        setIsOffline(true);
        setIsAdDone(true);
        setIsPinVerified(true);
      }
    });
  }, [contentId, episodeId]);

  const { data: content } = useQuery({
    queryKey: QueryKeys.content.detail(contentId ?? '', profileId),
    queryFn: () => contentApi.getOne(contentId!, profileId ?? undefined),
    enabled: !!contentId,
  });

  const { data: entitlement } = useQuery({
    queryKey: QueryKeys.content.entitlement(contentId ?? '', profileId),
    queryFn: () => contentApi.getEntitlement(contentId!, profileId ?? undefined),
    enabled: !!contentId && isAuth,
  });

  const { data: parental } = useQuery({
    queryKey: QueryKeys.profiles.parental(profileId ?? ''),
    queryFn: () => profileApi.getParentalControl(profileId!),
    enabled: !!profileId && isAuth,
  });

  const { data: currentSub } = useQuery({
    queryKey: ['subscription-me'],
    queryFn: () => subscriptionApi.getActive(),
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: watchApi.getActive,
    enabled: isAuth && !isOffline,
    refetchInterval: 30_000,
  });

  const { data: seasons } = useQuery({
    queryKey: QueryKeys.content.seasons(contentId ?? ''),
    queryFn: () => contentApi.getSeasons(contentId!),
    enabled: !!contentId && !!episodeId,
    staleTime: 10 * 60_000,
  });

  const { data: historyItem } = useQuery({
    queryKey: ['watch-history-item', contentId, episodeId, profileId],
    queryFn: async () => {
      const data = await watchApi.getHistory(profileId ?? undefined, 1, 50);
      const items = data?.items ?? [];
      return (
        items.find((h) =>
          episodeId ? h.episodeId === episodeId : h.contentId === contentId && !h.episodeId,
        ) ?? null
      );
    },
    enabled: isAuth && !isOffline,
    staleTime: 30_000,
  });

  const planCode =
    currentSub?.planDetails?.code ?? currentSub?.plan ?? currentSub?.planCode ?? 'FREE';
  const maxScreens = currentSub?.planDetails?.maxScreens ?? 1;
  const screenLimitExceeded =
    !staffReview && isAuth && !isOffline && (activeSessions?.length ?? 0) >= maxScreens;

  const maturityCode =
    (content as { maturityRating?: { code?: string } })?.maturityRating?.code;
  const isTimeRestricted = isHourRestricted(
    parental?.restrictedHoursStart ?? null,
    parental?.restrictedHoursEnd ?? null,
  );
  const isMaturityRestricted = isMaturityBlocked(
    maturityCode,
    resolveMaxMaturityCode(parental),
  );
  const requirePin =
    !staffReview &&
    !isPinVerified &&
    !!parental?.requirePin &&
    (isTimeRestricted || isMaturityRestricted);
  const parentalBlocked =
    !staffReview && (isTimeRestricted || isMaturityRestricted) && !isPinVerified;

  const isDraftPreview =
    !staffReview && resolveContentStatusCode(content) === 'DRAFT';

  const { data: stream, isLoading: isStreamLoading } = useQuery({
    queryKey: QueryKeys.stream.content(contentId ?? '', episodeId),
    queryFn: () =>
      episodeId
        ? videoApi.getEpisodeStream(episodeId)
        : videoApi.getStream(contentId!),
    enabled:
      !!contentId &&
      isAuth &&
      isPinVerified &&
      !isOffline &&
      !parentalBlocked &&
      !screenLimitExceeded,
    staleTime: 20 * 60_000,
  });

  const terminateAllMutation = useMutation({
    mutationFn: watchApi.terminateAll,
  });

  const startHeartbeat = useCallback(
    (sid: string) => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(async () => {
        const pos = Math.max(0, Math.floor(positionRef.current) || 0);
        try {
          await watchApi.heartbeat(sid, { currentPositionSec: pos });
        } catch {
          await new Promise((r) => setTimeout(r, 3000));
          watchApi.heartbeat(sid, { currentPositionSec: pos }).catch(() => undefined);
        }
        if (contentId) {
          contentApi
            .updateProgress(contentId, pos, episodeId, profileId ?? undefined)
            .catch(() => undefined);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    [contentId, episodeId, profileId],
  );

  const endSession = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    const sid = sessionIdRef.current;
    if (sid) {
      const finalPos = Math.max(0, Math.floor(positionRef.current) || 0);
      watchApi.endSession(sid, { finalPositionSec: finalPos }).catch(() => undefined);
      if (contentId) {
        contentApi
          .updateProgress(contentId, finalPos, episodeId, profileId ?? undefined)
          .catch(() => undefined);
      }
      sessionIdRef.current = null;
    }
  }, [contentId, episodeId, profileId]);

  useEffect(() => {
    if (!isAuth || isOffline || staffReview) {
      setIsAdDone(true);
      return;
    }
    const reason = entitlement?.reason;
    if (reason === 'AVOD' && !isAdDone) {
      adApi.getNext().then((ad) => {
        if (ad) setCurrentAd(ad as Ad);
        else setIsAdDone(true);
      });
    } else if (reason !== 'AVOD') {
      setIsAdDone(true);
    }
  }, [entitlement, isAuth, isOffline, isAdDone, staffReview]);

  useEffect(() => {
    if (!profileId || !parental) {
      setIsPinVerified(true);
      setShowPinModal(false);
      return;
    }
    if (parentalBlocked && parental.requirePin) {
      setShowPinModal(true);
      setIsPinVerified(false);
    } else if (parentalBlocked) {
      setIsPinVerified(false);
      setShowPinModal(false);
    } else {
      setIsPinVerified(true);
      setShowPinModal(false);
    }
  }, [parental, profileId, parentalBlocked]);

  useEffect(() => {
    if (initialTimeSec != null && initialTimeSec > 0) {
      const pos = Math.floor(initialTimeSec);
      setStartPosition(pos);
      positionRef.current = pos;
      return;
    }
    if (historyItem && !historyItem.completed) {
      const pos = Math.floor(historyItem.watchedSeconds ?? 0);
      if (pos > 0) {
        setStartPosition(pos);
        positionRef.current = pos;
      }
    }
  }, [historyItem, initialTimeSec]);

  const resolvedUrl = offlineUri
    ? offlineUri
    : stream?.url
      ? appendPlaybackToken(stream.url, stream.playbackToken)
      : undefined;

  useEffect(() => {
    if (
      !contentId ||
      !isAuth ||
      isOffline ||
      !resolvedUrl ||
      !isAdDone ||
      !isPinVerified ||
      parentalBlocked ||
      screenLimitExceeded
    ) {
      return;
    }
    if (sessionIdRef.current) return;

    watchApi
      .startSession({
        contentId,
        episodeId,
        profileId: profileId ?? undefined,
      })
      .then((session) => {
        const sid = resolveSessionId(session);
        if (!sid) return;
        sessionIdRef.current = sid;
        const pos = session.resumePositionSec ?? startPosition;
        if (pos > 5) {
          setStartPosition(pos);
          positionRef.current = pos;
        }
        startHeartbeat(sid);
      })
      .catch(() => undefined);

    return () => {
      endSession();
    };
  }, [
    contentId,
    episodeId,
    isAuth,
    isOffline,
    resolvedUrl,
    isAdDone,
    isPinVerified,
    parentalBlocked,
    screenLimitExceeded,
    profileId,
    startHeartbeat,
    endSession,
  ]);

  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      } else if (next === 'active' && sessionIdRef.current) {
        startHeartbeat(sessionIdRef.current);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [startHeartbeat]);

  const nextEpisode =
    episodeId && seasons
      ? resolveNextEpisode(seasons as Season[], episodeId)
      : null;

  const dismissNextEpisode = useCallback(() => {
    setShowNextEpisode(false);
  }, []);

  const recordQoE = useCallback(
    (
      eventType: 'startup' | 'rebuffer' | 'quality_change' | 'error',
      payload?: Record<string, unknown>,
    ) => {
      if (!contentId) return;
      watchApi
        .recordQoE({
          contentId,
          episodeId,
          sessionId: sessionIdRef.current ?? undefined,
          assetId: stream?.assetId,
          eventType,
          payload,
        })
        .catch(() => undefined);
    },
    [contentId, episodeId, stream?.assetId],
  );

  const onProgressUpdate = useCallback((seconds: number) => {
    positionRef.current = seconds;
  }, []);

  const onAdComplete = useCallback(() => {
    if (currentAd?.id) adApi.recordImpression(currentAd.id);
    setCurrentAd(null);
    setIsAdDone(true);
  }, [currentAd]);

  const onPinVerified = useCallback(() => {
    setIsPinVerified(true);
    setShowPinModal(false);
    setPinError(null);
  }, []);

  const onPinError = useCallback((msg: string | null) => {
    setPinError(msg);
  }, []);

  const onEnded = useCallback(() => {
    endSession();
    if (episodeId && seasons) {
      const next = resolveNextEpisode(seasons as Season[], episodeId);
      if (next) setShowNextEpisode(true);
    }
  }, [endSession, episodeId, seasons]);

  const isReady =
    isPinVerified &&
    !parentalBlocked &&
    !screenLimitExceeded &&
    !!resolvedUrl;

  return {
    content,
    stream,
    playbackUrl: resolvedUrl,
    currentAd,
    isOffline,
    isAdDone,
    isPinVerified,
    showPinModal: showPinModal && requirePin,
    pinError,
    startPosition,
    isStreamLoading,
    isReady,
    isPlaying,
    setIsPlaying,
    screenLimitExceeded,
    maxScreens,
    planCode,
    parentalBlocked,
    isTimeRestricted,
    isMaturityRestricted,
    requirePin,
    nextEpisode,
    showNextEpisode,
    dismissNextEpisode,
    activeProfileName: activeProfile?.name ?? 'ce profil',
    activeProfileId: profileId,
    onAdComplete,
    onPinVerified,
    onPinError,
    onProgressUpdate,
    onEnded,
    terminateAllSessions: () => terminateAllMutation.mutate(),
    isTerminating: terminateAllMutation.isPending,
    exitPlayback: endSession,
    recordQoE,
    sessionId: sessionIdRef.current,
    staffReview,
    isDraftPreview,
  };
}
