import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResumeThumbnail } from '@/components/content/ResumeThumbnail';
import { buildWatchHref, formatResumeLabel, canResumeSession, type WatchHistoryEntry } from '@/core/entities';
import { colors, gradients } from '@/theme/colors';
import { contentPosterUrl } from '@/utils/assets';
import { Image } from 'react-native';

type HistoryItem = WatchHistoryEntry & {
  content?: {
    id?: string;
    title?: string;
    duration?: number | null;
    posterObjectKey?: string | null;
    thumbnailObjectKey?: string | null;
    mediaAssets?: Array<{ objectKey: string; type?: { code: string } | string; isPrimary?: boolean }>;
  };
};

type Props = {
  item: HistoryItem | null;
};

/** Bandeau accueil « Tu en étais à… » — dernière reprise récente. */
export function ResumePromptBanner({ item }: Props) {
  const router = useRouter();
  if (!item?.content?.title || !canResumeSession(item)) return null;

  const pct = item.percentage ?? 0;

  const lastAt = item.lastWatchedAt ? new Date(item.lastWatchedAt).getTime() : 0;
  const hoursSince = (Date.now() - lastAt) / (1000 * 60 * 60);
  if (lastAt > 0 && hoursSince > 72) return null;

  const label = formatResumeLabel({
    seasonNumber: item.episode?.seasonNumber,
    episodeNumber: item.episode?.episodeNumber,
    percentage: pct,
    durationSec: item.content.duration,
    watchedSeconds: item.watchedSeconds,
  });

  const href = buildWatchHref(item.contentId, item);
  const poster = contentPosterUrl(item.content) ?? undefined;
  const preview = item.resumePreview;

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => router.push(href as never)}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Reprendre ${item.content.title}`}
    >
      <LinearGradient
        colors={['rgba(123,0,153,0.22)', 'rgba(0,5,13,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.thumb}>
          {preview ? (
            <ResumeThumbnail preview={preview} width={88} height={50} borderRadius={6} />
          ) : poster ? (
            <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={styles.posterPh} />
          )}
          <View style={styles.playBadge}>
            <Play color="#fff" size={14} fill="#fff" />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.kicker}>Tu en étais à…</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.content.title}
          </Text>
          {label ? (
            <Text style={styles.meta} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
        <ChevronRight color="rgba(255,255,255,0.5)" size={20} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12 },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,0,153,0.35)',
  },
  thumb: { width: 88, height: 50, borderRadius: 6, overflow: 'hidden' },
  poster: { width: 88, height: 50 },
  posterPh: { width: 88, height: 50, backgroundColor: colors.backgroundElevated },
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  body: { flex: 1, gap: 2 },
  kicker: { fontSize: 11, fontWeight: '600', color: colors.magenta, textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
});
