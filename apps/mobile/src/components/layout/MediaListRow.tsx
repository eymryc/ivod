import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { Play } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface MediaListRowProps {
  title: string;
  meta?: string;
  imageUri?: string | null;
  onPress?: () => void;
  right?: ReactNode;
  showPlay?: boolean;
}

export function MediaListRow({
  title,
  meta,
  imageUri,
  onPress,
  right,
  showPlay = true,
}: MediaListRowProps) {
  const media = (
    <>
      <View style={styles.thumb}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        {showPlay && onPress ? (
          <View style={styles.play}>
            <Play color="#fff" size={16} fill="#fff" />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </>
  );

  return (
    <View style={styles.wrap}>
      {onPress ? (
        <TouchableOpacity style={styles.left} onPress={onPress} activeOpacity={0.9}>
          {media}
        </TouchableOpacity>
      ) : (
        <View style={styles.left}>{media}</View>
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.7)",
    overflow: "hidden",
  },
  left: { flex: 1, flexDirection: "row" },
  thumb: {
    width: 100,
    height: 56,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  play: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, justifyContent: "center", padding: 12, gap: 4 },
  title: { ...typography.h3, fontSize: 14 },
  meta: { ...typography.caption },
});
