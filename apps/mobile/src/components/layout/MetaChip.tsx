import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

type ChipVariant = "default" | "genre" | "gold" | "exclusive";

export function MetaChip({
  label,
  variant = "default",
  style,
}: {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, variant === "genre" && styles.textGenre]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  default: {},
  genre: {
    borderColor: "rgba(255,123,0,0.35)",
    backgroundColor: "rgba(255,123,0,0.08)",
  },
  gold: {
    borderColor: "rgba(255,179,0,0.35)",
    backgroundColor: "rgba(255,179,0,0.08)",
  },
  exclusive: {
    borderColor: "rgba(230,0,126,0.4)",
    backgroundColor: "rgba(123,0,153,0.15)",
  },
  text: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  textGenre: { color: colors.orange },
});
