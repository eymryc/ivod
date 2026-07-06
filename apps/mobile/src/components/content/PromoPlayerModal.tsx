import { useEffect } from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { X } from "lucide-react-native";
import { promoApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import type { PromoVideo } from "@/core/entities/promo.entity";
import { mediaUrl } from "@/presentation/utils/media-url";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  promo: PromoVideo;
  contentTitle: string;
  onClose: () => void;
}

export function PromoPlayerModal({ promo, contentTitle, onClose }: Props) {
  const { data: stream, isLoading, isError } = useQuery({
    queryKey: QueryKeys.stream.promo(promo.id),
    queryFn: () => promoApi.getStream(promo.id),
    staleTime: 50 * 60_000,
  });

  const playbackUri = stream?.url ? mediaUrl(stream.url) ?? stream.url : null;
  const showVideo = Boolean(playbackUri && !isError);

  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!showVideo || !playbackUri) return;
    player.replace(playbackUri);
    player.loop = false;
    player.play();
    const sub = player.addListener("playToEnd", () => onClose());
    return () => {
      sub.remove();
      player.pause();
    };
  }, [showVideo, playbackUri, player, onClose]);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>{promo.displayLabel}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {contentTitle}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X color={colors.foreground} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.player}>
          {isLoading ? (
            <ActivityIndicator color={colors.magenta} size="large" />
          ) : showVideo ? (
            <VideoView
              style={StyleSheet.absoluteFill}
              player={player}
              nativeControls
              contentFit="contain"
            />
          ) : (
            <Text style={styles.error}>Vidéo promotionnelle indisponible.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  kicker: typography.kicker,
  title: { ...typography.h3, fontSize: 16 },
  player: {
    flex: 1,
    marginHorizontal: 0,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  error: { ...typography.bodyMuted, padding: 24, textAlign: "center" },
});
