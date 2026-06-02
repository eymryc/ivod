import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Play } from "lucide-react-native";
import { colors } from "@/theme/colors";
import type { Season } from "@/core/entities";

interface Props {
  contentId: string;
  seasons: Season[];
  canWatch: boolean;
}

export function SeasonEpisodeList({ contentId, seasons, canWatch }: Props) {
  const router = useRouter();
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id ?? "");
  const season = seasons.find((s) => s.id === activeSeasonId) ?? seasons[0];
  const episodes = season?.episodes ?? [];

  if (!episodes.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Épisodes</Text>
      {seasons.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {seasons.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.tab, activeSeasonId === s.id && styles.tabActive]}
              onPress={() => setActiveSeasonId(s.id)}
            >
              <Text style={[styles.tabText, activeSeasonId === s.id && styles.tabTextActive]}>
                Saison {s.seasonNumber}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {episodes.map((ep) => (
        <TouchableOpacity
          key={ep.id}
          style={styles.ep}
          disabled={!canWatch}
          onPress={() => router.push(`/watch/${contentId}?episodeId=${ep.id}`)}
        >
          <View style={styles.epNum}>
            <Text style={styles.epNumText}>{ep.episodeNumber ?? '-'}</Text>
          </View>
          <View style={styles.epBody}>
            <Text style={styles.epTitle} numberOfLines={1}>{ep.title}</Text>
            {ep.duration ? (
              <Text style={styles.epMeta}>{Math.round(ep.duration / 60)} min</Text>
            ) : null}
          </View>
          {canWatch ? <Play color={colors.magenta} size={18} /> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  tabs: { flexGrow: 0 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.magenta, backgroundColor: "rgba(230,0,126,0.12)" },
  tabText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  tabTextActive: { color: colors.magenta },
  ep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  epNum: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(230,0,126,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  epNumText: { fontWeight: "800", color: colors.magenta },
  epBody: { flex: 1 },
  epTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  epMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
