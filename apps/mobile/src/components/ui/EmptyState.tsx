import { View, Text, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { shadows } from "@/theme/shadows";
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
      <View style={[styles.panel, shadows.panel]}>
        <LinearGradient
          colors={["rgba(123,0,153,0.14)", "rgba(0,5,13,0.72)", "rgba(255,123,0,0.06)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topAccent}
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
    borderColor: "rgba(230,0,126,0.22)",
    padding: 28,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderRadius: layout.radiusSm,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderRadius: layout.radiusSm,
  },
  title: { ...typography.h2, fontSize: 18, textAlign: "center" },
  desc: { ...typography.bodyMuted, textAlign: "center", maxWidth: 280, lineHeight: 20 },
  btn: { marginTop: 12, alignSelf: "stretch", maxWidth: 280 },
});
