import type { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { shadows } from "@/theme/shadows";

interface ListCardProps {
  title: string;
  body?: string;
  meta?: string;
  unread?: boolean;
  right?: ReactNode;
  onPress?: () => void;
}

export function ListCard({ title, body, meta, unread, right, onPress }: ListCardProps) {
  const inner = (
    <>
      <LinearGradient
        colors={unread ? [...gradients.brand] : ["rgba(255,255,255,0.08)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />
      {unread ? <View style={styles.unreadBar} /> : null}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.cardUnread, shadows.card]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, unread && styles.cardUnread, shadows.card]}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.78)",
    gap: 10,
    overflow: "hidden",
    borderRadius: layout.radiusSm,
  },
  cardUnread: {
    borderColor: "rgba(230,0,126,0.38)",
    backgroundColor: "rgba(123,0,153,0.1)",
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.magenta,
  },
  content: { flex: 1, minWidth: 0, gap: 4, paddingLeft: 4 },
  title: { ...typography.h3, fontSize: 14 },
  body: { ...typography.bodyMuted, lineHeight: 18 },
  meta: { ...typography.caption, marginTop: 2 },
});
