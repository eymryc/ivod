import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Play } from "lucide-react-native";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { shadows } from "@/theme/shadows";

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
        ) : (
          <View style={styles.thumbPh} />
        )}
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
    <View style={[styles.wrap, shadows.card]}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />
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
    backgroundColor: "rgba(10,16,24,0.78)",
    overflow: "hidden",
    borderRadius: layout.radiusSm,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  left: { flex: 1, flexDirection: "row" },
  thumb: {
    width: 108,
    height: 62,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  thumbPh: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#12141c",
  },
  play: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, justifyContent: "center", padding: 12, gap: 4 },
  title: { ...typography.h3, fontSize: 14 },
  meta: { ...typography.caption },
});
