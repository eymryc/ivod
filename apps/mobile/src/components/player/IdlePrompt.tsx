import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/theme/colors';

const IDLE_THRESHOLD_MS = 3 * 60 * 60 * 1000;

interface Props {
  isPlaying: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function IdlePrompt({ isPlaying, onConfirm, onDismiss }: Props) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const accumulatedMs = useRef(0);
  const lastTickAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const startCountdown = useCallback(() => {
    setShow(true);
    setCountdown(30);
  }, []);

  const tick = useCallback(() => {
    if (!isPlaying || show) return;
    const now = Date.now();
    if (lastTickAt.current !== null) {
      const delta = now - lastTickAt.current;
      if (delta < 2000) accumulatedMs.current += delta;
    }
    lastTickAt.current = now;
    if (accumulatedMs.current >= IDLE_THRESHOLD_MS) {
      startCountdown();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, show, startCountdown]);

  // Countdown tick — fires onConfirm when it hits 0 (side-effect outside state updater)
  useEffect(() => {
    if (!show) return;
    if (countdown <= 0) { onConfirm(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [show, countdown, onConfirm]);

  useEffect(() => {
    if (isPlaying && !show) {
      lastTickAt.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickAt.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, show, tick]);

  const handleContinue = () => {
    setShow(false);
    setCountdown(30);
    accumulatedMs.current = 0;
    onDismiss();
  };

  if (!show) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.emoji}>😴</Text>
      <Text style={styles.title}>Vous regardez toujours ?</Text>
      <Text style={styles.sub}>
        La lecture va s&apos;arrêter dans <Text style={styles.bold}>{countdown}s</Text>.
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(countdown / 30) * 100}%` }]} />
      </View>
      <TouchableOpacity onPress={handleContinue} activeOpacity={0.9}>
        <LinearGradient
          colors={[...gradients.primaryBtn]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Continuer à regarder</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    zIndex: 50,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  bold: { color: '#fff', fontWeight: '700' },
  track: {
    width: '100%',
    maxWidth: 280,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.magenta },
  btn: { paddingHorizontal: 32, paddingVertical: 14, minWidth: 260 },
  btnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
