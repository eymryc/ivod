import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  PanResponder,
  Animated,
  Easing,
  type LayoutChangeEvent,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { SubtitleTrack as ExpoSubtitleTrack } from 'expo-video';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Subtitles,
  Lock,
  Unlock,
  Gauge,
  Volume2,
  VolumeX,
  ArrowLeft,
  Smartphone,
  Maximize2,
  PictureInPicture2,
  Bookmark,
} from 'lucide-react-native';
import { saveMoment } from '@/infrastructure/services/watch-moments.service';
import { toast } from '@/presentation/utils/toast';
import { colors, gradients } from '@/theme/colors';
import { typography } from '@/theme/typography';
import type { SubtitleTrack } from '@/infrastructure/api/modules/video.api';

const IDLE_MS = 3200;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];
type PlayerMenu = 'speed' | 'subtitles' | null;

function resolveVideoSource(url: string) {
  if (url.includes('.m3u8') || url.includes('/media?')) {
    return { uri: url, contentType: 'hls' as const };
  }
  return url;
}

function PlayerOptionBtn({
  onPress,
  active,
  disabled,
  label,
  children,
}: {
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.optionBtn, active && styles.optionBtnActive, disabled && styles.optionBtnDisabled]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {children}
    </TouchableOpacity>
  );
}

interface Props {
  url: string;
  startPosition?: number;
  durationSec?: number | null;
  subtitleTracks?: SubtitleTrack[];
  onBack?: () => void;
  headerBadge?: ReactNode;
  onTimeUpdate?: (seconds: number) => void;
  onEnded?: () => void;
  onQoE?: (
    event: 'startup' | 'rebuffer' | 'quality_change' | 'error',
    payload?: Record<string, unknown>,
  ) => void;
  onPlayingChange?: (playing: boolean) => void;
  contentId?: string;
  episodeId?: string;
  profileId?: string;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function BrandMark() {
  return (
    <MaskedView
      maskElement={<Text style={styles.brandMask}>iVOD</Text>}
    >
      <LinearGradient
        colors={['#a78bfa', colors.magenta, '#fb923c', '#fde047']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.brandMask, { opacity: 0 }]}>iVOD</Text>
      </LinearGradient>
    </MaskedView>
  );
}

function CinemaBuffering() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.bufferingWrap}>
      <Animated.View style={[styles.bufferingRing, { transform: [{ rotate }] }]} />
      <Text style={styles.bufferingLabel}>Chargement…</Text>
    </View>
  );
}

function PlayOrb({ paused, onPress }: { paused: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.playOrbTouch}
      accessibilityLabel={paused ? 'Lecture' : 'Pause'}
      accessibilityRole="button"
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.playOrbRing}
      >
        <View style={styles.playOrbInner}>
          {paused ? (
            <View style={{ marginLeft: 4 }}>
              <Play color="#fff" size={32} fill="#fff" />
            </View>
          ) : (
            <Pause color="#fff" size={32} fill="#fff" />
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function CinemaPlayer({
  url,
  startPosition = 0,
  durationSec,
  subtitleTracks = [],
  onBack,
  headerBadge,
  onTimeUpdate,
  onEnded,
  onQoE,
  onPlayingChange,
  contentId,
  episodeId,
  profileId,
}: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const videoRef = useRef<VideoView>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupSent = useRef(false);
  const wasPlaying = useRef(false);
  const seekApplied = useRef(false);
  const currentTimeRef = useRef(startPosition);
  const progressWidthRef = useRef(0);
  const isScrubbing = useRef(false);
  const lastTapLeft = useRef(0);
  const lastTapRight = useRef(0);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onQoERef = useRef(onQoE);
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; });
  useEffect(() => { onEndedRef.current = onEnded; });
  useEffect(() => { onQoERef.current = onQoE; });
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; });

  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(startPosition);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [buffering, setBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [skipFlash, setSkipFlash] = useState<'left' | 'right' | null>(null);
  const [speed, setSpeed] = useState<Speed>(1);
  const [locked, setLocked] = useState(false);
  const [menu, setMenu] = useState<PlayerMenu>(null);
  const [availableSubs, setAvailableSubs] = useState<ExpoSubtitleTrack[]>([]);
  const [activeSub, setActiveSub] = useState<ExpoSubtitleTrack | null>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [landscapeLocked, setLandscapeLocked] = useState(false);

  const player = useVideoPlayer(resolveVideoSource(url), (p) => {
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  const isIdle = !controlsVisible && !paused;

  const toggleMute = useCallback(() => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
    Haptics.selectionAsync().catch(() => undefined);
    wakeControls();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, player]);

  useEffect(() => {
    return () => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      try {
        player.pause();
      } catch {
        // Player déjà libéré
      }
    };
  }, [player]);

  useEffect(() => {
    if (startPosition > 0 && !seekApplied.current) {
      seekApplied.current = true;
      player.currentTime = startPosition;
      setCurrentTime(startPosition);
      currentTimeRef.current = startPosition;
    }
  }, [startPosition, player]);

  useEffect(() => {
    const subs = [
      player.addListener('timeUpdate', ({ currentTime: t }) => {
        if (!isScrubbing.current) {
          setCurrentTime(t);
          currentTimeRef.current = t;
          onTimeUpdateRef.current?.(t);
        }
      }),
      player.addListener('playingChange', ({ isPlaying }) => {
        setPaused(!isPlaying);
        onPlayingChangeRef.current?.(isPlaying);
        if (isPlaying) wasPlaying.current = true;
      }),
      player.addListener('statusChange', ({ status, error }) => {
        setBuffering(status === 'loading');
        if (status === 'readyToPlay') {
          const d = player.duration;
          if (d > 0) setDuration(d);
          if (!startupSent.current) {
            startupSent.current = true;
            onQoERef.current?.('startup');
          }
        }
        if (status === 'loading' && wasPlaying.current) {
          onQoERef.current?.('rebuffer', { at: currentTimeRef.current });
        }
        if (error) onQoERef.current?.('error');
      }),
      player.addListener('playToEnd', () => {
        setPaused(true);
        onPlayingChangeRef.current?.(false);
        onEndedRef.current?.();
      }),
      player.addListener('availableSubtitleTracksChange', ({ availableSubtitleTracks }) => {
        setAvailableSubs(availableSubtitleTracks);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [player]);

  const wakeControls = useCallback(() => {
    if (locked) return;
    setControlsVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!paused) {
      idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_MS);
    }
  }, [locked, paused]);

  useEffect(() => {
    if (paused) {
      setControlsVisible(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    }
  }, [paused]);

  const toggleOrientation = useCallback(async () => {
    try {
      if (landscapeLocked) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setLandscapeLocked(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setLandscapeLocked(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      wakeControls();
    } catch {
      // Appareil ou simulateur sans support orientation
    }
  }, [landscapeLocked, wakeControls]);

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.pause();
      setControlsVisible(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    } else {
      player.play();
      wakeControls();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [player, wakeControls]);

  const seekBy = useCallback(
    (delta: number, dir: 'left' | 'right') => {
      const next = Math.max(
        0,
        Math.min(currentTimeRef.current + delta, duration || currentTimeRef.current + Math.abs(delta)),
      );
      player.currentTime = next;
      setCurrentTime(next);
      currentTimeRef.current = next;
      onTimeUpdateRef.current?.(next);
      setSkipFlash(dir);
      setTimeout(() => setSkipFlash(null), 650);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      wakeControls();
    },
    [duration, player, wakeControls],
  );

  const handleTapLeft = useCallback(() => {
    const now = Date.now();
    if (now - lastTapLeft.current < 350) seekBy(-10, 'left');
    else wakeControls();
    lastTapLeft.current = now;
  }, [seekBy, wakeControls]);

  const handleTapRight = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRight.current < 350) seekBy(10, 'right');
    else wakeControls();
    lastTapRight.current = now;
  }, [seekBy, wakeControls]);

  const seekTo = useCallback(
    (seconds: number) => {
      const next = Math.max(0, Math.min(seconds, duration || seconds));
      player.currentTime = next;
      setCurrentTime(next);
      currentTimeRef.current = next;
      onTimeUpdateRef.current?.(next);
    },
    [duration, player],
  );

  const progressPan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      isScrubbing.current = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (progressWidthRef.current || 1)));
      setScrubTime(ratio * (duration || 0));
    },
    onPanResponderMove: (e) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (progressWidthRef.current || 1)));
      setScrubTime(ratio * (duration || 0));
    },
    onPanResponderRelease: (e) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (progressWidthRef.current || 1)));
      const next = ratio * (duration || 0);
      setScrubTime(null);
      isScrubbing.current = false;
      seekTo(next);
      wakeControls();
    },
    onPanResponderTerminate: () => {
      setScrubTime(null);
      isScrubbing.current = false;
    },
  });

  const onProgressLayout = useCallback((e: LayoutChangeEvent) => {
    progressWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const setPlaybackSpeed = useCallback(
    (s: Speed) => {
      player.playbackRate = s;
      setSpeed(s);
      setMenu(null);
      Haptics.selectionAsync().catch(() => undefined);
      wakeControls();
    },
    [player, wakeControls],
  );

  const toggleMenu = useCallback(
    (next: Exclude<PlayerMenu, null>) => {
      setMenu((current) => (current === next ? null : next));
      wakeControls();
    },
    [wakeControls],
  );

  const togglePictureInPicture = useCallback(async () => {
    try {
      await videoRef.current?.startPictureInPicture();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      wakeControls();
    } catch {
      // PiP non configuré ou non supporté
    }
  }, [wakeControls]);

  const saveCurrentMoment = useCallback(async () => {
    if (!contentId || !profileId) {
      toast.error('Connexion requise pour enregistrer un moment.');
      return;
    }
    const pos = Math.floor(currentTimeRef.current);
    try {
      await saveMoment(profileId, {
        profileId,
        contentId,
        episodeId: episodeId ?? null,
        positionSec: pos,
        label: formatTime(pos),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast.success(`Moment enregistré à ${formatTime(pos)}`);
      wakeControls();
    } catch {
      toast.error('Impossible d’enregistrer ce moment.');
    }
  }, [contentId, episodeId, profileId, wakeControls]);

  const displayTime = scrubTime ?? currentTime;
  const pct = duration > 0 ? (displayTime / duration) * 100 : 0;
  const hasSubtitles = availableSubs.length > 0 || subtitleTracks.length > 0;
  const showChrome = controlsVisible && !locked;

  return (
    <View style={styles.root}>
      <VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture
      />

      <LinearGradient
        colors={['rgba(2,2,8,0.45)', 'transparent']}
        style={[styles.scrimTop, isIdle && styles.scrimIdle]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(2,2,8,0.5)']}
        style={[styles.scrimBottom, isIdle && styles.scrimIdle]}
        pointerEvents="none"
      />

      {buffering ? <CinemaBuffering /> : null}

      {skipFlash === 'left' ? (
        <View style={[styles.skipFlash, styles.skipLeft]}>
          <RotateCcw color="#fff" size={18} />
          <Text style={styles.skipText}>−10 s</Text>
        </View>
      ) : null}
      {skipFlash === 'right' ? (
        <View style={[styles.skipFlash, styles.skipRight]}>
          <Text style={styles.skipText}>+10 s</Text>
          <RotateCw color="#fff" size={18} />
        </View>
      ) : null}

      {locked ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setControlsVisible((v) => !v)}>
          {controlsVisible ? (
            <View style={[styles.lockBar, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={() => { setLocked(false); wakeControls(); }}
                accessibilityLabel="Déverrouiller l'écran"
                accessibilityRole="button"
              >
                <Unlock color="#fff" size={18} />
                <Text style={styles.unlockText}>Déverrouiller</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Pressable>
      ) : (
        <>
          <Pressable style={styles.tapLeft} onPress={handleTapLeft} />
          <Pressable style={styles.tapCenter} onPress={togglePlay} />
          <Pressable style={styles.tapRight} onPress={handleTapRight} />

          {paused && showChrome ? (
            <View style={styles.playOverlay} pointerEvents="box-none">
              <PlayOrb paused={paused} onPress={togglePlay} />
            </View>
          ) : null}

          {showChrome ? (
            <View style={styles.controls} pointerEvents="box-none">
              <View style={[styles.chromeTop, { paddingTop: insets.top + 8 }]}>
                <View style={styles.chromeTopLeft}>
                  {onBack ? (
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={onBack}
                      accessibilityLabel="Retour"
                      accessibilityRole="button"
                    >
                      <ArrowLeft color="rgba(255,255,255,0.9)" size={18} />
                    </TouchableOpacity>
                  ) : null}
                  {headerBadge ? <View style={styles.headerBadge}>{headerBadge}</View> : null}
                </View>
              </View>

              <View style={[styles.brandMark, { top: insets.top + 52 }]} pointerEvents="none">
                <BrandMark />
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
                style={[styles.bottomGradient, { paddingBottom: Math.max(insets.bottom, 12) }]}
                pointerEvents="box-none"
              >
                {scrubTime !== null ? (
                  <Text style={styles.scrubLabel}>{formatTime(scrubTime)}</Text>
                ) : null}

                <View
                  style={styles.progressHit}
                  onLayout={onProgressLayout}
                  {...progressPan.panHandlers}
                >
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={[...gradients.brand]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${pct}%` }]}
                    />
                    <View style={[styles.progressThumb, { left: `${pct}%` }]} />
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.playBarBtn}
                    accessibilityLabel={paused ? 'Lecture' : 'Pause'}
                    accessibilityRole="button"
                  >
                    {paused ? (
                      <Play color="#fff" size={20} fill="#fff" />
                    ) : (
                      <Pause color="#fff" size={20} fill="#fff" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.time}>
                    {formatTime(displayTime)}
                    {duration > 0 ? (
                      <Text style={styles.timeMuted}> / {formatTime(duration)}</Text>
                    ) : null}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.optionsRow}
                  style={styles.optionsScroll}
                >
                  <PlayerOptionBtn
                    onPress={() => seekBy(-10, 'left')}
                    label="Reculer de 10 secondes"
                  >
                    <RotateCcw color="rgba(255,255,255,0.9)" size={17} />
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={() => seekBy(10, 'right')}
                    label="Avancer de 10 secondes"
                  >
                    <RotateCw color="rgba(255,255,255,0.9)" size={17} />
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={() => toggleMenu('speed')}
                    active={speed !== 1 || menu === 'speed'}
                    label={`Vitesse ${speed}×`}
                  >
                    <Gauge color={speed !== 1 || menu === 'speed' ? colors.magenta : 'rgba(255,255,255,0.85)'} size={17} />
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={() => hasSubtitles && toggleMenu('subtitles')}
                    active={activeSub !== null || menu === 'subtitles'}
                    disabled={!hasSubtitles}
                    label="Sous-titres"
                  >
                    <Subtitles
                      color={
                        !hasSubtitles
                          ? 'rgba(255,255,255,0.25)'
                          : activeSub !== null || menu === 'subtitles'
                            ? colors.magenta
                            : 'rgba(255,255,255,0.85)'
                      }
                      size={17}
                    />
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={toggleOrientation}
                    active={landscapeLocked}
                    label={landscapeLocked ? 'Revenir en portrait' : 'Passer en paysage'}
                  >
                    {landscapeLocked ? (
                      <Smartphone color={colors.magenta} size={17} />
                    ) : (
                      <Maximize2 color="rgba(255,255,255,0.85)" size={17} />
                    )}
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={toggleMute}
                    active={muted}
                    label={muted ? 'Activer le son' : 'Couper le son'}
                  >
                    {muted ? (
                      <VolumeX color={colors.magenta} size={17} />
                    ) : (
                      <Volume2 color="rgba(255,255,255,0.85)" size={17} />
                    )}
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={() => { setLocked(true); setControlsVisible(false); }}
                    label="Verrouiller l'écran"
                  >
                    <Lock color="rgba(255,255,255,0.85)" size={17} />
                  </PlayerOptionBtn>
                  <PlayerOptionBtn
                    onPress={togglePictureInPicture}
                    label="Picture-in-Picture"
                  >
                    <PictureInPicture2 color="rgba(255,255,255,0.85)" size={17} />
                  </PlayerOptionBtn>
                  {contentId && profileId ? (
                    <PlayerOptionBtn
                      onPress={saveCurrentMoment}
                      label="Enregistrer ce moment"
                    >
                      <Bookmark color="rgba(255,255,255,0.85)" size={17} />
                    </PlayerOptionBtn>
                  ) : null}
                </ScrollView>
              </LinearGradient>

              {menu === 'speed' ? (
                <View style={[styles.inlineMenu, { bottom: Math.max(insets.bottom, 12) + 118 }]}>
                  <Text style={styles.menuTitle}>Vitesse de lecture</Text>
                  <View style={styles.speedRow}>
                    {SPEEDS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.speedChip, speed === s && styles.speedChipActive]}
                        onPress={() => setPlaybackSpeed(s)}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.speedChipText, speed === s && styles.speedChipTextActive]}>
                          {s}×
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {menu === 'subtitles' ? (
                <View style={[styles.inlineMenu, { bottom: Math.max(insets.bottom, 12) + 118 }]}>
                  <Text style={styles.menuTitle}>Sous-titres</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.speedRow}>
                      <TouchableOpacity
                        style={[styles.speedChip, !activeSub && styles.speedChipActive]}
                        onPress={() => { player.subtitleTrack = null; setActiveSub(null); setMenu(null); }}
                      >
                        <Text style={[styles.speedChipText, !activeSub && styles.speedChipTextActive]}>Aucun</Text>
                      </TouchableOpacity>
                      {availableSubs.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.speedChip, activeSub?.id === t.id && styles.speedChipActive]}
                          onPress={() => { player.subtitleTrack = t; setActiveSub(t); setMenu(null); }}
                        >
                          <Text style={[styles.speedChipText, activeSub?.id === t.id && styles.speedChipTextActive]}>
                            {t.label ?? t.language ?? t.id}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable style={StyleSheet.absoluteFill} onPress={wakeControls} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '14%',
    zIndex: 2,
    opacity: 0.55,
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
    maxHeight: 180,
    zIndex: 2,
    opacity: 0.6,
  },
  scrimIdle: { opacity: 0 },
  bufferingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.62)',
    zIndex: 8,
  },
  bufferingRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopColor: colors.magenta,
    borderRightColor: colors.orange,
  },
  bufferingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  skipFlash: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 7,
  },
  skipLeft: { left: '10%' },
  skipRight: { right: '10%' },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  lockBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  unlockText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 7 },
  tapCenter: { position: 'absolute', left: '30%', right: '30%', top: 0, bottom: 0, zIndex: 7 },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', zIndex: 7 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  controls: { ...StyleSheet.absoluteFillObject, zIndex: 8 },
  chromeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 9,
  },
  chromeTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: { paddingTop: 6 },
  brandMark: {
    position: 'absolute',
    left: 16,
    zIndex: 7,
  },
  brandMask: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.magenta,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 40,
    gap: 6,
    zIndex: 20,
  },
  optionsScroll: {
    marginHorizontal: -4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  optionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionBtnActive: {
    backgroundColor: 'rgba(230,0,126,0.22)',
  },
  optionBtnDisabled: {
    opacity: 0.45,
  },
  scrubLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  progressHit: { height: 28, justifyContent: 'center' },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressThumb: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    borderWidth: 2,
    borderColor: colors.magenta,
    shadowColor: colors.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  playBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  timeMuted: { color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  playOrbTouch: { alignItems: 'center', justifyContent: 'center' },
  playOrbRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOrbInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(8,8,16,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineMenu: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(8,8,16,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 0,
    padding: 14,
    minWidth: 200,
    zIndex: 22,
  },
  menuTitle: {
    ...typography.fieldLabel,
    marginBottom: 10,
  },
  speedRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  speedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  speedChipActive: { backgroundColor: 'rgba(230,0,126,0.18)', borderColor: colors.magenta },
  speedChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  speedChipTextActive: { color: colors.magenta },
});
