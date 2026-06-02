/**
 * Hook useWatchSession — Gestion complète d'une session de lecture.
 * Aligné web : startSession + heartbeat 30s + endSession + progression.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/infrastructure/api/modules/content.api';
import { videoApi } from '@/infrastructure/api/modules/video.api';
import { adApi } from '@/infrastructure/api/modules/ad.api';
import { watchApi } from '@/infrastructure/api/modules/watch.api';
import { profileApi } from '@/infrastructure/api/modules/profile.api';
import { getOfflineByContentId } from '@/infrastructure/services/offline.service';
import { getOfflinePlaybackUri } from '@/core/entities';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import type { Ad, Content } from '@/core/entities';

export interface UseWatchSessionResult {
  content: Content | undefined;
  playbackUrl: string | undefined;
  currentAd: Ad | null;
  isOffline: boolean;
  isAdDone: boolean;
  isPinVerified: boolean;
  showPinModal: boolean;
  startPosition: number;
  isStreamLoading: boolean;
  isReady: boolean;
  onAdComplete: () => void;
  onPinVerified: () => void;
  onProgressUpdate: (seconds: number) => void;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

function resolveSessionId(session: { id?: string; sessionId?: string }): string | null {
  return session.sessionId ?? session.id ?? null;
}

export function useWatchSession(
  contentId: string | undefined,
  episodeId: string | undefined,
): UseWatchSessionResult {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);

  const sessionIdRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [offlineUri, setOfflineUri] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [isAdDone, setIsAdDone] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [startPosition, setStartPosition] = useState(0);

  useEffect(() => {
    if (!contentId || episodeId) return;
    getOfflineByContentId(contentId).then((item) => {
      if (!item) return;
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

  const { data: stream, isLoading: isStreamLoading } = useQuery({
    queryKey: QueryKeys.stream.content(contentId ?? '', episodeId),
    queryFn: () =>
      episodeId
        ? videoApi.getEpisodeStream(episodeId)
        : videoApi.getStream(contentId!),
    enabled: !!contentId && isAuth && isAdDone && isPinVerified && !isOffline,
    staleTime: 20 * 60_000,
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
    if (!isAuth || isOffline) {
      setIsAdDone(true);
      setIsPinVerified(true);
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
  }, [entitlement, isAuth, isOffline, isAdDone]);

  useEffect(() => {
    if (!profileId || !parental) {
      setIsPinVerified(true);
      return;
    }
    if (parental.requirePin) setShowPinModal(true);
    else setIsPinVerified(true);
  }, [parental, profileId]);

  const playbackUrl = offlineUri ?? stream?.url;

  useEffect(() => {
    if (!contentId || !isAuth || isOffline || !playbackUrl || !isAdDone || !isPinVerified) {
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
        const pos = session.resumePositionSec ?? 0;
        if (pos > 5) setStartPosition(pos);
        positionRef.current = pos;
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
    playbackUrl,
    isAdDone,
    isPinVerified,
    profileId,
    startHeartbeat,
    endSession,
  ]);

  // Pause heartbeat when app goes to background, resume when it returns to foreground
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
  }, []);

  const isReady = isAdDone && isPinVerified && !!playbackUrl;

  return {
    content,
    playbackUrl,
    currentAd,
    isOffline,
    isAdDone,
    isPinVerified,
    showPinModal,
    startPosition,
    isStreamLoading,
    isReady,
    onAdComplete,
    onPinVerified,
    onProgressUpdate,
  };
}
