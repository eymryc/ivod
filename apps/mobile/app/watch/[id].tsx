/**
 * Écran de lecture vidéo plein écran — parité web /watch.
 */

import { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, StatusBar, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, AlertCircle, Lock, Clock } from 'lucide-react-native';

import { useWatchSession } from '@/presentation/hooks/use-watch-session';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import { AdOverlay } from '@/components/player/AdOverlay';
import { ParentalPinModal } from '@/components/player/ParentalPinModal';
import { CinemaPlayer } from '@/components/player/IvodVideoPlayer';
import { NextEpisodeCountdown } from '@/components/player/NextEpisodeCountdown';
import { IdlePrompt } from '@/components/player/IdlePrompt';
import {
  WatchLoading,
  WatchStatePanel,
  WatchActionButton,
} from '@/components/player/WatchStatePanel';
import { WatchModerationBadge, WatchPreviewBadge } from '@/components/player/WatchBadges';
import type { AdConfig } from '@/components/player/AdOverlay';
import { colors } from '@/theme/colors';
import { isAdmin } from '@/presentation/utils/auth-roles';

export default function WatchScreen() {
  const { id, episodeId, review, t } = useLocalSearchParams<{
    id: string;
    episodeId?: string;
    review?: string;
    t?: string;
  }>();
  const initialTimeSec = t ? Math.max(0, parseInt(t, 10) || 0) : undefined;
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const user = useAuthStore((s) => s.user);
  const staffReview = review === '1' && isAdmin(user);
  const isExiting = useRef(false);

  const {
    content,
    stream,
    playbackUrl,
    currentAd,
    isOffline,
    isAdDone,
    showPinModal,
    activeProfileId,
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
    requirePin,
    nextEpisode,
    showNextEpisode,
    dismissNextEpisode,
    onAdComplete,
    onPinVerified,
    onProgressUpdate,
    onEnded,
    terminateAllSessions,
    isTerminating,
    recordQoE,
    isDraftPreview,
    exitPlayback,
  } = useWatchSession(id, episodeId, { staffReview, initialTimeSec });

  useEffect(() => {
    StatusBar.setHidden(true);
    return () => StatusBar.setHidden(false);
  }, []);

  const goBack = useCallback(() => {
    if (isExiting.current) return;
    isExiting.current = true;
    exitPlayback();
    StatusBar.setHidden(false);
    void qc.invalidateQueries({ queryKey: ['watch'] });
    void qc.invalidateQueries({ queryKey: ['watch-history-item'] });
    void qc.invalidateQueries({ queryKey: QueryKeys.watch.history(profileId) });
    void qc.invalidateQueries({ queryKey: ['watch-history-rails'] });
    void qc.invalidateQueries({ queryKey: QueryKeys.content.detail(id ?? '', profileId) });
    router.back();
  }, [exitPlayback, qc, profileId, id, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  const effectiveAd: AdConfig = currentAd
    ? {
        type: (currentAd as { type?: string }).type === 'html' ? 'branded' : 'video',
        url: (currentAd as { url?: string }).url,
        link: (currentAd as { link?: string }).link,
        skipAfter: (currentAd as { skipAfter?: number }).skipAfter ?? 5,
        adId: currentAd.id,
      }
    : { type: 'branded', skipAfter: 5 };

  if (!isAuth) {
    return (
      <WatchStatePanel
        title="Connexion requise"
        description="Connectez-vous pour regarder ce contenu."
      >
        <WatchActionButton label="Se connecter" onPress={() => router.push('/(auth)/login')} primary />
      </WatchStatePanel>
    );
  }

  // Pub AVOD : indépendante de l'état du flux — affichée dès qu'elle est prête,
  // le flux continue de charger en parallèle (parité web : `showAd`).
  if (currentAd && !isAdDone) {
    return (
      <View style={styles.root}>
        <AdOverlay ad={effectiveAd} onComplete={onAdComplete} />
      </View>
    );
  }

  if (isStreamLoading && !playbackUrl) {
    return <WatchLoading />;
  }

  if (requirePin && activeProfileId) {
    return (
      <View style={styles.root}>
        <ParentalPinModal
          profileId={activeProfileId}
          visible={showPinModal}
          onVerified={onPinVerified}
          onCancel={goBack}
        />
      </View>
    );
  }

  if (parentalBlocked && !requirePin) {
    return (
      <WatchStatePanel
        icon={
          isTimeRestricted ? (
            <Clock color={colors.warning} size={32} />
          ) : (
            <Lock color={colors.warning} size={32} />
          )
        }
        title="Contenu restreint"
        description={
          isTimeRestricted
            ? 'Ce contenu n\'est pas accessible aux heures configurées sur ce profil.'
            : 'Ce contenu est déconseillé pour ce profil selon le contrôle parental.'
        }
      >
        <WatchActionButton label="Retour à la fiche" onPress={() => router.replace(`/content/${id}`)} />
        <WatchActionButton label="Paramètres parentaux" onPress={() => router.push('/settings/parental')} primary />
      </WatchStatePanel>
    );
  }

  if (screenLimitExceeded) {
    return (
      <WatchStatePanel
        icon={<AlertCircle color={colors.warning} size={32} />}
        title="Limite d'appareils atteinte"
        description={`Votre plan ${planCode} permet ${maxScreens} écran${maxScreens > 1 ? 's' : ''} simultané${maxScreens > 1 ? 's' : ''}.`}
      >
        <WatchActionButton
          label="Déconnecter tous les appareils"
          onPress={terminateAllSessions}
          primary
          disabled={isTerminating}
        />
        <WatchActionButton label="Changer de plan" onPress={() => router.push('/settings/subscription')} />
      </WatchStatePanel>
    );
  }

  if (!isReady || !playbackUrl) {
    return (
      <WatchStatePanel
        title="Lecture indisponible"
        description="Impossible de charger le flux vidéo pour ce contenu."
      >
        <WatchActionButton label="Retour à la fiche" onPress={() => router.replace(`/content/${id}`)} primary />
      </WatchStatePanel>
    );
  }

  return (
    <View style={styles.root}>
      {isOffline ? (
        <View style={[styles.offlineBadge, { top: insets.top + 8 }]}>
          <WifiOff color="#fff" size={14} />
        </View>
      ) : null}

      <CinemaPlayer
        url={playbackUrl}
        startPosition={startPosition}
        durationSec={(content as { duration?: number })?.duration ?? null}
        subtitleTracks={stream?.subtitleTracks}
        contentId={id}
        episodeId={episodeId}
        profileId={profileId ?? undefined}
        onBack={goBack}
        headerBadge={
          staffReview ? (
            <WatchModerationBadge />
          ) : isDraftPreview ? (
            <WatchPreviewBadge />
          ) : null
        }
        onTimeUpdate={onProgressUpdate}
        onEnded={() => {
          onEnded();
          if (!nextEpisode) router.replace(`/content/${id}`);
        }}
        onQoE={recordQoE}
        onPlayingChange={setIsPlaying}
      />

      {showNextEpisode && nextEpisode ? (
        <NextEpisodeCountdown
          episodeNumber={nextEpisode.episodeNumber}
          episodeTitle={nextEpisode.title}
          onPlayNow={() =>
            router.replace(`/watch/${id}?episodeId=${nextEpisode.id}`)
          }
          onDismiss={() => {
            dismissNextEpisode();
            router.replace(`/content/${id}`);
          }}
        />
      ) : null}

      <IdlePrompt
        isPlaying={isPlaying && isAdDone}
        onConfirm={() => setIsPlaying(false)}
        onDismiss={() => setIsPlaying(true)}
      />

      {showPinModal && activeProfileId ? (
        <ParentalPinModal
          profileId={activeProfileId}
          visible
          onVerified={onPinVerified}
          onCancel={goBack}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  offlineBadge: {
    position: 'absolute',
    right: 12,
    zIndex: 30,
    backgroundColor: colors.magenta,
    padding: 8,
  },
});
