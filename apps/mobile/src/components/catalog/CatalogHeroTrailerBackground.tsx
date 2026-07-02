import { useEffect, useState } from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { Volume2, VolumeX } from "lucide-react-native";
import { promoApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { mediaUrl } from "@/presentation/utils/media-url";
import { colors } from "@/theme/colors";

interface Props {
  promoId: string;
  posterUri: string | null;
}

/** BA / teaser en boucle — expo-video (compatible Expo Go, pas react-native-video). */
export function CatalogHeroTrailerBackground({ promoId, posterUri }: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const { data: stream, isError } = useQuery({
    queryKey: QueryKeys.stream.promo(promoId),
    queryFn: () => promoApi.getStream(promoId),
    staleTime: 50 * 60_000,
    retry: 1,
  });

  const playbackUri = stream?.url ? mediaUrl(stream.url) ?? stream.url : null;
  const showVideo = Boolean(playbackUri && !isError);

  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    setVideoReady(false);
    if (!playbackUri || isError) return;
    player.replace(playbackUri);
    player.loop = true;
    player.muted = !soundOn;
    player.play();
  }, [playbackUri, isError, player, promoId]);

  useEffect(() => {
    player.muted = !soundOn;
  }, [soundOn, player]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={[StyleSheet.absoluteFillObject, showVideo && videoReady ? styles.hidden : null]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallback]} />
      )}
      {showVideo ? (
        <VideoView
          player={player}
          style={[StyleSheet.absoluteFillObject, videoReady ? null : styles.hidden]}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setVideoReady(true)}
        />
      ) : null}
      {showVideo && videoReady ? (
        <Pressable
          onPress={() => setSoundOn((v) => !v)}
          style={styles.soundBtn}
          accessibilityRole="button"
          accessibilityLabel={
            soundOn ? "Couper le son de la bande-annonce" : "Activer le son de la bande-annonce"
          }
        >
          {soundOn ? (
            <Volume2 size={18} color={colors.foreground} />
          ) : (
            <VolumeX size={18} color={colors.foreground} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  fallback: { backgroundColor: "#030508" },
  soundBtn: {
    position: "absolute",
    top: 52,
    right: 14,
    zIndex: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
