import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronDown, Trash2, Play } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DownloadEpisodeRow } from "@/components/downloads/DownloadEpisodeRow";
import type { DownloadEpisodeLabel } from "@/core/downloads/download-labels";
import {
  qualityShortLabel,
  formatExpiryChip,
} from "@/core/downloads/download-display";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { shadows } from "@/theme/shadows";

export type DownloadSeriesRow = {
  id: string;
  contentId: string;
  episodeId?: string | null;
  quality?: string;
  expiresAt?: string;
  content?: { title?: string };
  episode?: {
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  };
  offline?: {
    posterLocalUri?: string;
    title?: string;
    downloadId: string;
  };
  episodeLabel: DownloadEpisodeLabel;
  episodeMeta?: string;
  watchEpisodeId?: string;
};

type Props = {
  seriesTitle: string;
  thumb?: string | null;
  items: DownloadSeriesRow[];
  onRemove: (row: DownloadSeriesRow) => void;
  onRemoveAll: (rows: DownloadSeriesRow[]) => void;
};

const CARD_W = layout.screenWidth - layout.pagePaddingX * 2;
const BANNER_H = Math.round(CARD_W * (9 / 16));

export function DownloadSeriesGroup({
  seriesTitle,
  thumb,
  items,
  onRemove,
  onRemoveAll,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(items.length <= 4);
  const count = items.length;
  const first = items[0];

  const qualities = [...new Set(items.map((i) => i.quality).filter(Boolean))];
  const qLabel = qualities.length === 1 ? qualityShortLabel(qualities[0]) : "HD";
  const soonestExpiry = items
    .map((i) => i.expiresAt)
    .filter(Boolean)
    .sort(
      (a, b) => new Date(a!).getTime() - new Date(b!).getTime(),
    )[0];
  const expiry = formatExpiryChip(soonestExpiry);

  const confirmRemoveAll = () => {
    Alert.alert(
      "Supprimer la série",
      `Retirer les ${count} épisodes de l'appareil ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => onRemoveAll(items),
        },
      ],
    );
  };

  const playFirst = () => {
    router.push({
      pathname: "/watch/[id]",
      params: {
        id: first.contentId,
        ...(first.watchEpisodeId ? { episodeId: first.watchEpisodeId } : {}),
      },
    });
  };

  return (
    <View style={[styles.wrap, shadows.card]}>
        <View style={styles.banner}>
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPh} />
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,5,13,0.5)", "rgba(0,5,13,0.95)"]}
            locations={[0.2, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {count} ép.
            </Text>
          </View>

          {qLabel ? (
            <View style={styles.qualityPill}>
              <Text style={styles.qualityText}>{qLabel}</Text>
            </View>
          ) : null}

          <View style={styles.bannerFooter}>
            <View style={styles.bannerCopy}>
              <Text style={styles.kicker}>Série</Text>
              <Text style={styles.title} numberOfLines={2}>
                {seriesTitle}
              </Text>
              {expiry ? (
                <Text
                  style={[
                    styles.expiry,
                    expiry.urgent && styles.expiryUrgent,
                  ]}
                >
                  {expiry.label}
                </Text>
              ) : null}
            </View>

            <View style={styles.bannerActions}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={playFirst}
                hitSlop={8}
              >
                <LinearGradient
                  colors={["#7b0099", "#e6007e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playGrad}
                >
                  <Play color="#fff" size={18} fill="#fff" style={{ marginLeft: 2 }} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmRemoveAll} style={styles.iconBtn}>
                <Trash2 color="rgba(255,255,255,0.55)" size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setExpanded((v) => !v)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <ChevronDown
                  color="rgba(255,255,255,0.55)"
                  size={22}
                  style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {expanded ? (
        <View style={styles.episodes}>
          <View style={styles.episodesHead}>
            <Text style={styles.episodesLabel}>Épisodes</Text>
            <TouchableOpacity onPress={() => router.push(`/content/${first.contentId}`)}>
              <Text style={styles.episodesLink}>Fiche série</Text>
            </TouchableOpacity>
          </View>
          {items.map((row, index) => (
            <DownloadEpisodeRow
              key={row.id}
              label={row.episodeLabel}
              meta={row.episodeMeta}
              hideSecondary
              isLast={index === items.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/watch/[id]",
                  params: {
                    id: row.contentId,
                    ...(row.watchEpisodeId
                      ? { episodeId: row.watchEpisodeId }
                      : {}),
                  },
                })
              }
              onRemove={() =>
                Alert.alert("Supprimer", "Retirer cet épisode ?", [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => onRemove(row),
                  },
                ])
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CARD_W,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  banner: {
    width: "100%",
    height: BANNER_H,
    backgroundColor: colors.surface,
  },
  bannerPh: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceHover,
  },
  countPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  qualityPill: {
    position: "absolute",
    top: 12,
    left: 72,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  qualityText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  bannerFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  bannerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.magenta,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  expiry: {
    fontSize: 11,
    color: colors.mutedDim,
    marginTop: 4,
    fontWeight: "500",
  },
  expiryUrgent: { color: colors.gold },
  bannerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },
  playBtn: {},
  playGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  episodes: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  episodesHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  episodesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  episodesLink: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.magenta,
  },
});
