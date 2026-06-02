/**
 * Écran de lecture vidéo (Watch Screen).
 *
 * Responsabilité unique : orchestrer l'affichage du lecteur à partir
 * des données fournies par le hook useWatchSession.
 *
 * Ce composant gère uniquement l'UI :
 * - Lecteur vidéo react-native-video
 * - Overlay de publicité (AVOD)
 * - Modal PIN parental
 * - Badge hors-ligne
 * - Placeholder de chargement
 *
 * Toute la logique métier (session, stream, pub, progression) est
 * dans useWatchSession — voir src/presentation/hooks/use-watch-session.ts.
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, WifiOff } from 'lucide-react-native';

import { useWatchSession } from '@/presentation/hooks/use-watch-session';
import { useAuthStore } from '@/store/auth.store';
import { AdOverlay } from '@/components/player/AdOverlay';
import { ParentalPinModal } from '@/components/player/ParentalPinModal';
import { colors } from '@/theme/colors';
import type { AdConfig } from '@/components/player/AdOverlay';

// ─── Écran ──────────────────────────────────────────────────────────────────

export default function WatchScreen() {
  const { id, episodeId } = useLocalSearchParams<{ id: string; episodeId?: string }>();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
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
  } = useWatchSession(id, episodeId);

  const player = useVideoPlayer(
    isReady && playbackUrl ? { uri: playbackUrl } : null,
    (p) => {
      if (startPosition > 0) p.currentTime = startPosition;
      p.play();
    },
  );

  // Suivi de progression toutes les 15s
  useEffect(() => {
    if (!player) return;
    progressTimerRef.current = setInterval(() => {
      if (player.currentTime > 0) onProgressUpdate(player.currentTime);
    }, 15_000);
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [player]);

  // Masque la status bar en plein écran et la restaure à l'unmount
  useEffect(() => {
    StatusBar.setHidden(true);
    return () => StatusBar.setHidden(false);
  }, []);

  const thumbnailUrl = content?.thumbnailUrl ?? content?.posterUrl;

  return (
    <View style={styles.container}>

      {/* ── Bouton retour ─────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <ArrowLeft color="#fff" size={24} />
      </TouchableOpacity>

      {/* ── Badge hors-ligne ──────────────────────────────────────────────── */}
      {isOffline ? (
        <View style={styles.offlineBadge}>
          <WifiOff color="#fff" size={14} />
          <Text style={styles.offlineText}>Hors ligne</Text>
        </View>
      ) : null}

      {/* ── Zone lecteur ──────────────────────────────────────────────────── */}
      <View style={styles.player}>

        {/* Publicité AVOD */}
        {currentAd && !isAdDone ? (
          <AdOverlay
            ad={currentAd as AdConfig}
            onComplete={onAdComplete}
          />

        ) : isReady && playbackUrl ? (
          /* Lecteur vidéo */
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls
          />

        ) : (
          /* Placeholder : chargement ou erreur */
          <View style={[styles.video, styles.placeholder]}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={RNStyleSheet.absoluteFillObject}
              />
            ) : null}
            <View style={styles.overlay}>
              {!isAuth ? (
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.ctaText}>Se connecter</Text>
                </TouchableOpacity>
              ) : isStreamLoading || !isPinVerified ? (
                <ActivityIndicator color={colors.magenta} size="large" />
              ) : (
                <Text style={styles.errorText}>Lecture indisponible</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Informations sur le contenu ───────────────────────────────────── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {content?.title ?? '…'}
        </Text>
      </View>

      {/* ── Modal PIN parental ────────────────────────────────────────────── */}
      {id ? (
        <ParentalPinModal
          profileId={id}
          visible={showPinModal && !isPinVerified}
          onVerified={onPinVerified}
          onCancel={() => router.back()}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  back: {
    position: 'absolute',
    top: 48,
    left: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
  },
  offlineBadge: {
    position: 'absolute',
    top: 48,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.magenta,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButton: {
    backgroundColor: colors.magenta,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: colors.muted,
  },
  info: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
});
