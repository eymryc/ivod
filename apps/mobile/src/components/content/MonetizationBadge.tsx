import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

export function MonetizationBadge({
  visibility,
  monetization,
}: {
  visibility?: string;
  monetization?: string;
}) {
  const code = monetization ?? visibility;
  if (!code || code === "PUBLIC" || code === "FREE") return null;

  const map: Record<string, { label: string; bg: string; text: string }> = {
    SVOD: { label: "Premium", bg: "rgba(230,0,126,0.9)", text: "#fff" },
    SUBSCRIBERS_ONLY: { label: "Premium", bg: "rgba(230,0,126,0.9)", text: "#fff" },
    PREMIUM_ONLY: { label: "Premium", bg: "rgba(230,0,126,0.9)", text: "#fff" },
    TVOD: { label: "Achat", bg: "rgba(255,179,0,0.95)", text: "#000" },
    PPV: { label: "Achat", bg: "rgba(255,179,0,0.95)", text: "#000" },
    AVOD: { label: "Pub", bg: "rgba(123,0,153,0.85)", text: "#fff" },
  };

  const cfg = map[code] ?? { label: code, bg: colors.surface, text: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
});
