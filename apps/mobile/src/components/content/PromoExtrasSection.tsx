import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";
import { PromoPlayerModal } from "./PromoPlayerModal";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  contentTitle: string;
  promoVideos?: PromoVideosBundle | null;
}

/** Liste complète des vidéos promo (au-delà des boutons hero). */
export function PromoExtrasSection({ contentTitle, promoVideos }: Props) {
  const [active, setActive] = useState<PromoVideo | null>(null);
  const items = promoVideos?.all ?? [];

  if (items.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bandes-annonces et plus</Text>
      {items.map((promo) => (
        <TouchableOpacity
          key={promo.id}
          style={styles.row}
          onPress={() => setActive(promo)}
          activeOpacity={0.85}
        >
          <Text style={styles.label} numberOfLines={1}>
            {promo.displayLabel}
          </Text>
          {promo.durationSec ? (
            <Text style={styles.meta}>{Math.round(promo.durationSec / 60)} min</Text>
          ) : null}
        </TouchableOpacity>
      ))}
      {active ? (
        <PromoPlayerModal
          promo={active}
          contentTitle={contentTitle}
          onClose={() => setActive(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { ...typography.h3, fontSize: 17, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  label: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 12 },
});
