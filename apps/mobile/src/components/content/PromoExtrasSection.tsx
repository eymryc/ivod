import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";
import {
  buildPromoExtraGroups,
  countPromoVideos,
} from "@/core/promo/display";
import { PromoPlayerModal } from "./PromoPlayerModal";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

function formatPromoDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m} min ${s} s`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

interface Props {
  contentTitle: string;
  promoVideos?: PromoVideosBundle | null;
}

export function PromoExtrasSection({ contentTitle, promoVideos }: Props) {
  const [active, setActive] = useState<PromoVideo | null>(null);
  const groups = buildPromoExtraGroups(promoVideos);
  const total = countPromoVideos(promoVideos);

  if (total <= 1 || groups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bandes-annonces et plus</Text>
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.items.map((promo) => (
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
                <Text style={styles.meta}>{formatPromoDuration(promo.durationSec)}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
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
  wrap: { gap: 12 },
  title: { ...typography.h3, fontSize: 17, marginBottom: 4 },
  group: { gap: 8 },
  groupTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 2,
  },
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
