import { View, Text, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.panel}>
        <LinearGradient
          colors={["rgba(123,0,153,0.12)", "rgba(0,5,13,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.iconWrap}>
          <Icon color={colors.magenta} size={36} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} style={styles.btn} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  wrapCompact: { flex: 0, paddingVertical: 32 },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { ...typography.h2, fontSize: 18, textAlign: "center" },
  desc: { ...typography.bodyMuted, textAlign: "center", maxWidth: 280, lineHeight: 20 },
  btn: { marginTop: 12, alignSelf: "stretch", maxWidth: 280 },
});
