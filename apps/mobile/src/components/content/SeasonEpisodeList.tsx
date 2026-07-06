import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Check, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AccentLine } from '@/components/layout/AccentLine';
import { colors, gradients } from '@/theme/colors';
import { typography } from '@/theme/typography';
import type { Season } from '@/core/entities';
import { episodeThumbnailUrl } from '@/utils/assets';
import { formatEpisodeDisplayTitle } from '@/core/utils/episode-display';

export interface WatchedEpisode {
  episodeId?: string;
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
}

interface Props {
  contentId: string;
  seasons: Season[];
  canWatch: boolean;
  canDownload?: boolean;
  watchHistory?: WatchedEpisode[];
  /** Épisode en cours de reprise — surligné dans la liste. */
  resumeEpisodeId?: string | null;
  /** Poster série — fallback si l'épisode n'a pas de vignette. */
  fallbackPosterUrl?: string | null;
}

const CARD_W = 208;

function seasonLabel(season: Season): string {
  const count = season.episodes?.length ?? 0;
  const base = season.title
    ? `Saison ${season.seasonNumber} — ${season.title}`
    : `Saison ${season.seasonNumber}`;
  return `${base} (${count} ép.)`;
}

export function SeasonEpisodeList({
  contentId,
  seasons,
  canWatch,
  watchHistory = [],
  resumeEpisodeId,
  fallbackPosterUrl,
}: Props) {
  const router = useRouter();
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id ?? '');
  const season = seasons.find((s) => s.id === activeSeasonId) ?? seasons[0];
  const tabScrollRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, { x: number; width: number }>>({});

  const handleTabLayout = useCallback((id: string, e: LayoutChangeEvent) => {
    tabPositions.current[id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
  }, []);

  const selectSeason = useCallback((id: string) => {
    setActiveSeasonId(id);
    const pos = tabPositions.current[id];
    if (pos) {
      tabScrollRef.current?.scrollTo({ x: Math.max(0, pos.x - 16), animated: true });
    }
  }, []);
  const episodes = season?.episodes ?? [];

  const historyByEpisode = watchHistory.reduce<Record<string, WatchedEpisode>>((acc, h) => {
    if (h.episodeId) acc[h.episodeId] = h;
    return acc;
  }, {});

  if (!episodes.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AccentLine width={40} />
        <Text style={styles.title}>Épisodes</Text>
      </View>

      {seasons.length > 1 ? (
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
        >
          {seasons.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.tab, activeSeasonId === s.id && styles.tabActive]}
              onLayout={(e) => handleTabLayout(s.id, e)}
              onPress={() => selectSeason(s.id)}
            >
              <Text style={[styles.tabText, activeSeasonId === s.id && styles.tabTextActive]}>
                {seasonLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {episodes.map((ep) => {
          const watched = historyByEpisode[ep.id];
          const pct = watched?.percentage ?? 0;
          const completed = watched?.completed ?? false;
          const thumb =
            ep.thumbnailUrl ??
            episodeThumbnailUrl(ep.thumbnailObjectKey) ??
            fallbackPosterUrl ??
            null;
          const href = canWatch ? `/watch/${contentId}?episodeId=${ep.id}` : null;
          const display = formatEpisodeDisplayTitle(ep.title ?? '', ep.episodeNumber ?? 0);
          const isResumeEpisode = resumeEpisodeId === ep.id;

          return (
            <TouchableOpacity
              key={ep.id}
              style={[
                styles.card,
                !canWatch && styles.cardDisabled,
                isResumeEpisode && styles.cardResume,
              ]}
              disabled={!canWatch}
              onPress={() => href && router.push(href as never)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[...gradients.brand]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardAccent}
              />
              <View style={styles.thumb}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPh} />
                )}
                {canWatch ? (
                  <View style={styles.playOrb}>
                    <Play color="#fff" size={16} fill="#fff" />
                  </View>
                ) : (
                  <View style={styles.lockOrb}>
                    <Lock color="#fff" size={14} />
                  </View>
                )}
                {completed ? (
                  <View style={styles.doneBadge}>
                    <Check color="#fff" size={12} />
                  </View>
                ) : null}
                {pct > 0 && !completed ? (
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={[...gradients.brand]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]}
                    />
                  </View>
                ) : null}
              </View>
              <Text style={styles.epNum}>Ép. {ep.episodeNumber}</Text>
              <Text style={styles.epTitle} numberOfLines={2}>
                {display.primary}
              </Text>
              {display.secondary ? (
                <Text style={styles.epSecondary} numberOfLines={1}>
                  {display.secondary}
                </Text>
              ) : null}
              {(ep as { duration?: number }).duration ? (
                <Text style={styles.epMeta}>
                  {Math.round(((ep as { duration?: number }).duration ?? 0) / 60)} min
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  tabs: { flexGrow: 0 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(230,0,126,0.12)' },
  tabText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.magenta },
  rail: { gap: 14, paddingVertical: 4 },
  card: {
    width: CARD_W,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderRadius: 4,
  },
  cardDisabled: { opacity: 0.7 },
  cardResume: {
    borderWidth: 2,
    borderColor: colors.magenta,
    borderRadius: 6,
  },
  cardAccent: { height: 2, width: '100%' },
  thumb: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0c14',
    overflow: 'hidden',
  },
  thumbPh: { ...StyleSheet.absoluteFillObject, backgroundColor: '#12141c' },
  playOrb: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  lockOrb: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  doneBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.success,
    padding: 4,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: { height: '100%' },
  epNum: {
    ...typography.kicker,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  epTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  epSecondary: {
    fontSize: 11,
    color: colors.muted,
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  epMeta: {
    fontSize: 11,
    color: colors.muted,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
});
