import { View, Text, StyleSheet, TouchableOpacity, type ReactNode } from "react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

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
        style={[styles.card, unread && styles.cardUnread]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, unread && styles.cardUnread]}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.7)",
    gap: 10,
    overflow: "hidden",
  },
  cardUnread: {
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(230,0,126,0.06)",
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
