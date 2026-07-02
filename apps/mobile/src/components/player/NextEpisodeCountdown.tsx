import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SkipForward, X } from 'lucide-react-native';
import { colors, gradients } from '@/theme/colors';

interface Props {
  episodeNumber: number;
  episodeTitle?: string;
  remainingSec?: number;
  onPlayNow: () => void;
  onDismiss: () => void;
}

export function NextEpisodeCountdown({
  episodeNumber,
  episodeTitle,
  remainingSec = 5,
  onPlayNow,
  onDismiss,
}: Props) {
  const [remaining, setRemaining] = useState(remainingSec);
  const progress = ((remainingSec - remaining) / remainingSec) * 100;

  useEffect(() => {
    if (remaining <= 0) { onPlayNow(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onPlayNow]);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progress, { width: `${progress}%` }]}
      />
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.meta}>
            <Text style={styles.kicker}>Épisode suivant</Text>
            <Text style={styles.title} numberOfLines={2}>
              Ép. {episodeNumber}
              {episodeTitle ? ` — ${episodeTitle}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss} hitSlop={12} style={styles.close}>
            <X color="rgba(255,255,255,0.6)" size={18} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onPlayNow} activeOpacity={0.9}>
          <LinearGradient
            colors={[...gradients.primaryBtn]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <SkipForward color="#fff" size={16} />
            <Text style={styles.ctaText}>Lancer maintenant</Text>
            <Text style={styles.timer}>{remaining}s</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 288,
    maxWidth: '92%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    overflow: 'hidden',
    zIndex: 40,
  },
  progress: { position: 'absolute', top: 0, left: 0, height: 2 },
  body: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  meta: { flex: 1, gap: 4 },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.magenta,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#fff' },
  close: { padding: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  timer: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontVariant: ['tabular-nums'] },
});
