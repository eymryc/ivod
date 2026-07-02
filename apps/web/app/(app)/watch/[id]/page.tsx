"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, Lock, Clock, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "@/lib/toast";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { videosApi } from "@/lib/api/videos";
import { watchApi } from "@/lib/api/watch";
import { contentsApi } from "@/lib/api/contents";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { profilesApi } from "@/lib/api/profiles";
import { usePlayerStore } from "@/lib/stores/player.store";
import { useProfileStore } from "@/lib/stores/profile.store";
import { useUIStore } from "@/lib/stores/ui.store";
import { AdOverlay } from "@/components/player/AdOverlay";
import type { AdConfig } from "@/components/player/AdOverlay";
import { adsApi } from "@/lib/api/ads";
import { NextEpisodeCountdown } from "@/components/player/NextEpisodeCountdown";
import { IdleDetection } from "@/components/player/IdleDetection";
import { ParentalPinModal } from "@/components/profile/ParentalPinModal";
import { episodesApi } from "@/lib/api/episodes";
import { ApiError } from "@/lib/api/client";
import { resolveDurationSeconds } from "@/lib/utils/format";
import { resolveMaxMaturityCode } from "@/lib/utils/catalog-maturity";
import {
  WatchBackdrop,
  WatchHoverBack,
  WatchLoading,
  WatchPreviewBadge,
  WatchModerationBadge,
  WatchStage,
  WatchStatePanel,
  Link,
} from "@/components/player/WatchChrome";
import { useAuthStore, isAdmin } from "@/lib/stores/auth.store";

const CinemaPlayer = dynamic(
  () => import("@/components/player/VideoPlayer").then((m) => m.CinemaPlayer),
  { ssr: false }
);

const HEARTBEAT_INTERVAL = 30_000;
// Ordre croissant de restriction : ALL < -12 < -16 < -18
const MATURITY_ORDER = ["ALL", "-12", "-16", "-18"];

function isHourRestricted(start: number | null, end: number | null): boolean {
  if (start == null || end == null) return false;
  const hour = new Date().getHours();
  // Restriction peut chevaucher minuit (ex: 22h → 6h)
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

function isMaturityBlocked(contentCode: string | undefined, maxCode: string | undefined): boolean {
  if (!contentCode || !maxCode || maxCode === "-18") return false;
  const contentIdx = MATURITY_ORDER.indexOf(contentCode);
  const maxIdx = MATURITY_ORDER.indexOf(maxCode);
  if (contentIdx === -1 || maxIdx === -1) return false;
  return contentIdx > maxIdx;
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("ep") ?? undefined;
  const returnTo = searchParams.get("return");
  const user = useAuthStore((s) => s.user);
  const staffReview =
    searchParams.get("review") === "1" && isAdmin(user);

  const { setSession, clearSession } = usePlayerStore();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const { dataSaver, preferredQuality } = useUIStore();
  const effectiveQuality = dataSaver ? "480p" : preferredQuality;

  const [adDone, setAdDone] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [, setCinemaIdle] = useState(false);
  const activeProfile = useProfileStore((s) => s.getActiveProfile());

  const verifyPinMutation = useMutation({
    mutationFn: (pin: string) => profilesApi.verifyPin(activeProfileId!, pin),
    onSuccess: () => { setPinVerified(true); setPinError(null); },
    onError: () => setPinError("PIN incorrect"),
  });

  const sessionIdRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const impressionSentRef = useRef(false);

  // ── Données ────────────────────────────────────────────────────────────

  const { data: content } = useQuery({
    queryKey: ["content", id],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
  });

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    staleTime: 5 * 60_000,
  });

  // S1 — Historique profil-aware
  const { data: history } = useQuery({
    queryKey: ["watch-history-item", id, episodeId, activeProfileId],
    queryFn: async () => {
      const data = activeProfileId
        ? await watchApi.getHistoryByProfile(activeProfileId, 1, 50)
        : await watchApi.getHistory(1, 50);
      const items: any[] = data?.items ?? [];
      return (
        items.find((h: any) =>
          episodeId
            ? h.episodeId === episodeId
            : h.contentId === id && !h.episodeId
        ) ?? null
      );
    },
    staleTime: 30_000,
  });

  const startPosition = history?.completed ? 0 : Math.floor(history?.watchedSeconds ?? 0);

  const { data: streamData, isLoading: streamLoading, error: streamError } = useQuery({
    queryKey: ["stream", id, episodeId],
    queryFn: () =>
      episodeId ? videosApi.getEpisodeStreamUrl(episodeId) : videosApi.getStreamUrl(id),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const { data: activeSessions } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: watchApi.getActive,
    refetchInterval: 30_000, // Ux3 — refetch plus fréquent pour détecter les conflits
  });

  const { data: allSeasons } = useQuery({
    queryKey: ["seasons", id],
    queryFn: () => episodesApi.getSeasons(id),
    enabled: !!episodeId,
    staleTime: 10 * 60_000,
  });

  // B6 — Contrôle parental du profil actif
  const { data: parentalControl } = useQuery({
    queryKey: ["parental-control", activeProfileId],
    queryFn: () => profilesApi.getParentalControl(activeProfileId!),
    enabled: !!activeProfileId,
    staleTime: 5 * 60_000,
  });

  // B1 — Pub AVOD : utiliser /ads/next (pas /ads/preroll qui n'existe pas)
  const planCode = (currentSub as any)?.plan ?? "FREE";
  const { data: adConfig } = useQuery({
    queryKey: ["preroll-ad"],
    queryFn: adsApi.getNext,
    enabled: planCode === "FREE",
    staleTime: 10 * 60_000,
  });

  // ── Épisode suivant ────────────────────────────────────────────────────

  const { currentEpisode, nextEpisode } = (() => {
    if (!episodeId || !allSeasons) return { currentEpisode: null, nextEpisode: null };
    const allEps: any[] = (allSeasons as any[]).flatMap((s: any) =>
      (s.episodes ?? []).map((ep: any) => ({ ...ep, seasonNumber: s.seasonNumber }))
    );
    const currentIdx = allEps.findIndex((ep) => ep.id === episodeId);
    const current = currentIdx >= 0 ? allEps[currentIdx] : null;
    const next =
      currentIdx >= 0 && currentIdx < allEps.length - 1 ? allEps[currentIdx + 1] : null;
    return { currentEpisode: current, nextEpisode: next };
  })();

  const isDraftPreview = !staffReview && (content as any)?.status === "DRAFT";

  // ── Vérifications parentales ───────────────────────────────────────────

  const isTimeRestricted = isHourRestricted(
    parentalControl?.restrictedHoursStart ?? null,
    parentalControl?.restrictedHoursEnd ?? null
  );
  const isMaturityRestricted = isMaturityBlocked(
    (content as any)?.maturityRating?.code,
    resolveMaxMaturityCode(parentalControl) ?? undefined,
  );
  const requirePin =
    !staffReview &&
    !pinVerified &&
    !!parentalControl?.requirePin &&
    (isTimeRestricted || isMaturityRestricted);
  const parentalBlocked =
    !staffReview && (isTimeRestricted || isMaturityRestricted) && !pinVerified;

  // ── Session ────────────────────────────────────────────────────────────

  const startSessionMutation = useMutation({
    mutationFn: () =>
      watchApi.startSession({
        contentId: id,
        episodeId,
        quality: effectiveQuality,
        profileId: activeProfileId ?? undefined,
      }),
    onSuccess: (data) => {
      const sessionId = data.sessionId ?? data.id;
      if (!sessionId) return;
      setSession(sessionId, id, episodeId);
      sessionIdRef.current = sessionId;
      startHeartbeat(sessionId);
    },
    onError: (err) => showApiError(err),
  });

  const terminateAllMutation = useMutation({
    mutationFn: watchApi.terminateAll,
    onSuccess: () => startSessionMutation.mutate(),
  });

  // Ux3 — Heartbeat avec retry sur erreur réseau
  const startHeartbeat = useCallback((sid: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      const pos = { currentPositionSec: Math.max(0, Math.floor(positionRef.current) || 0) };
      try {
        await watchApi.heartbeat(sid, pos);
      } catch {
        // Retry unique après 3s si la première tentative échoue
        await new Promise((r) => setTimeout(r, 3_000));
        watchApi.heartbeat(sid, pos).catch(() => {});
      }
      // S3 — Sauvegarder la progression explicitement à chaque heartbeat
      contentsApi
        .updateProgress(
          id,
          Math.max(0, Math.floor(positionRef.current) || 0),
          episodeId,
          activeProfileId,
        )
        .catch(() => {});
    }, HEARTBEAT_INTERVAL);
  }, [id, episodeId]);

  const endSession = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    const sid = sessionIdRef.current;
    if (sid) {
      const finalPos = Math.max(0, Math.floor(positionRef.current) || 0);
      watchApi.endSession(sid, { finalPositionSec: finalPos });
      // S3 — Sauvegarde finale de la progression même en cas de fermeture brutale
      contentsApi.updateProgress(id, finalPos, episodeId, activeProfileId).catch(() => {});
      clearSession();
      sessionIdRef.current = null;
    }
  }, [clearSession, id, episodeId]);

  useEffect(() => {
    if (streamData?.url && !sessionIdRef.current && !parentalBlocked && !staffReview) {
      startSessionMutation.mutate();
    }
    return () => { endSession(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamData?.url, parentalBlocked, staffReview]);

  // B2 — Pub AVOD (pas en aperçu studio / brouillon / modération staff)
  const showAd = !staffReview && planCode === "FREE" && !adDone && !isDraftPreview;

  const handleAdComplete = useCallback(() => {
    setAdDone(true);
    // Après la pub (souvent muette), réactiver le son du lecteur principal
    setTimeout(() => {
      const v = document.querySelector(".ivod-cinema video") as HTMLVideoElement | null;
      if (v) {
        v.muted = false;
        if (v.volume < 0.1) v.volume = 1;
      }
    }, 300);
  }, []);
  useEffect(() => {
    if (showAd && adConfig?.id && !impressionSentRef.current) {
      impressionSentRef.current = true;
      adsApi.recordImpression(adConfig.id, false);
    }
  }, [showAd, adConfig?.id]);

  const handleTimeUpdate = useCallback((t: number) => {
    positionRef.current = t;
    setIsPlaying(true);
  }, []);

  const handleQoE = useCallback(
    (event: {
      eventType: "startup" | "rebuffer" | "quality_change" | "error";
      payload?: Record<string, unknown>;
    }) => {
      watchApi
        .recordQoE({
          contentId: id,
          episodeId,
          sessionId: sessionIdRef.current ?? undefined,
          assetId: (streamData as { assetId?: string })?.assetId,
          eventType: event.eventType,
          payload: event.payload,
        })
        .catch(() => {});
    },
    [id, episodeId, streamData],
  );

  const handleEnded = useCallback(() => {
    endSession();
    if (nextEpisode) {
      setShowNextEpisode(true);
    } else {
      router.push(`/content/${id}`);
    }
  }, [endSession, id, router, nextEpisode]);

  // Mapper AdConfig API → AdConfig composant
  const effectiveAd: AdConfig = adConfig
    ? {
        type: adConfig.type === "html" ? "branded" : (adConfig.type as "video" | "image"),
        url: adConfig.url,
        link: adConfig.link,
        skipAfter: adConfig.skipAfter ?? 5,
        adId: adConfig.id,
      }
    : { type: "branded", skipAfter: 5 };

  // B4 — Seuil correct : >= (pas >) pour bloquer avant de dépasser la limite
  const maxScreens = (currentSub as any)?.planDetails?.maxScreens ?? 1;
  const screenLimitExceeded =
    !staffReview && (activeSessions?.length ?? 0) >= maxScreens;

  // ── Rendus ─────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    endSession();
    if (returnTo && returnTo.startsWith("/admin")) {
      router.push(returnTo);
    } else {
      router.push(`/content/${id}`);
    }
  }, [endSession, id, router, returnTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goBack]);

  if (streamLoading) return <WatchLoading />;

  if (streamError || !streamData?.url) {
    const errMsg = getApiErrorMessage(streamError) ?? "";
    return (
      <WatchStatePanel
        icon={<AlertCircle size={32} className="text-red-400" />}
        title=""
        description={errMsg}
      >
        <Link
          href={`/content/${id}`}
          className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-6 py-3 text-sm text-white transition-colors hover:bg-white/10"
        >
          Retour à la fiche
        </Link>
      </WatchStatePanel>
    );
  }

  if (requirePin && activeProfileId) {
    return (
      <WatchBackdrop>
        <ParentalPinModal
          profileName={activeProfile?.name ?? "ce profil"}
          onConfirm={(pin) => verifyPinMutation.mutate(pin)}
          onCancel={() => router.back()}
          error={pinError}
          isLoading={verifyPinMutation.isPending}
        />
      </WatchBackdrop>
    );
  }

  if (parentalBlocked) {
    return (
      <WatchStatePanel
        icon={
          isTimeRestricted ? (
            <Clock size={32} className="text-orange-400" />
          ) : (
            <Lock size={32} className="text-orange-400" />
          )
        }
        title="Contenu restreint"
        description={
          isTimeRestricted
            ? `Ce contenu n'est pas accessible entre ${parentalControl?.restrictedHoursStart}h et ${parentalControl?.restrictedHoursEnd}h sur ce profil.`
            : "Ce contenu est déconseillé pour ce profil selon le contrôle parental configuré."
        }
      >
        <Link
          href={`/content/${id}`}
          className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-6 py-3 text-sm text-white transition-colors hover:bg-white/10"
        >
          Retour à la fiche
        </Link>
        <Link
          href="/settings/parental"
          className="rounded-xl border border-primary/30 bg-primary/15 px-6 py-3 text-sm text-primary transition-colors hover:bg-primary/25"
        >
          Paramètres parentaux
        </Link>
      </WatchStatePanel>
    );
  }

  if (screenLimitExceeded) {
    return (
      <WatchStatePanel
        icon={<AlertCircle size={32} className="text-yellow-400" />}
        title="Limite d'appareils atteinte"
        description={`Votre plan ${planCode} permet ${maxScreens} écran${maxScreens > 1 ? "s" : ""} simultané${maxScreens > 1 ? "s" : ""}.`}
      >
        <button
          type="button"
          onClick={() => terminateAllMutation.mutate()}
          disabled={terminateAllMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {terminateAllMutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Déconnecter tous les appareils
        </button>
        <Link
          href="/settings/subscription"
          className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-6 py-3 text-sm text-white transition-colors hover:bg-white/10"
        >
          Changer de plan
        </Link>
      </WatchStatePanel>
    );
  }

  const playbackDurationSec = resolveDurationSeconds(
    (content as { duration?: number })?.duration,
    (content as { videoDurationSec?: number })?.videoDurationSec,
  );

  return (
    <WatchBackdrop>
      <WatchStage>
        <WatchHoverBack
          onBack={goBack}
          badge={
            staffReview ? (
              <WatchModerationBadge />
            ) : isDraftPreview ? (
              <WatchPreviewBadge />
            ) : undefined
          }
        />

        {showAd && <AdOverlay ad={effectiveAd} onComplete={handleAdComplete} />}

        <div className="ivod-cinema-screen">
          <CinemaPlayer
            src={streamData.url}
            format={streamData.format}
            playbackToken={streamData.playbackToken}
            durationSec={playbackDurationSec}
            startPosition={startPosition}
            subtitleTracks={
              (streamData as { subtitleTracks?: Array<{ id: string; label: string; language: string; objectKey: string; src?: string }> })
                ?.subtitleTracks ??
              content?.subtitleTracks ??
              []
            }
            storyboardSpriteUrl={(streamData as { storyboard?: { spriteUrl?: string } })?.storyboard?.spriteUrl}
            storyboardVttUrl={(streamData as { storyboard?: { vttUrl?: string } })?.storyboard?.vttUrl}
            onTimeUpdate={handleTimeUpdate}
            onQoE={handleQoE}
            onEnded={handleEnded}
            onError={() => {}}
            autoPlay={!showAd}
            cinemaMode
            sharpVideo
            showBrandMark={false}
            initialQuality={effectiveQuality}
            onCinemaIdleChange={setCinemaIdle}
          />
        </div>

        {showNextEpisode && nextEpisode && (
          <NextEpisodeCountdown
            contentId={id}
            nextEpisodeId={nextEpisode.id}
            nextEpisodeTitle={nextEpisode.title}
            nextEpisodeNumber={nextEpisode.episodeNumber}
            onDismiss={() => {
              setShowNextEpisode(false);
              router.push(`/content/${id}`);
            }}
          />
        )}

        <IdleDetection
          isPlaying={isPlaying && !showAd}
          onConfirm={() => setIsPlaying(false)}
          onDismiss={() => setIsPlaying(false)}
        />
      </WatchStage>
    </WatchBackdrop>
  );
}
