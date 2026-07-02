import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Clapperboard, Sparkles, Film } from "lucide-react-native";
import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";
import { buildPromoActions } from "@/core/promo/display";
import { PromoPlayerModal } from "./PromoPlayerModal";
import { colors } from "@/theme/colors";

function PromoIcon({ typeCode }: { typeCode: string }) {
  const color = colors.foreground;
  if (typeCode === "TEASER") return <Sparkles color={color} size={16} />;
  if (typeCode === "CLIP" || typeCode === "MAKING_OF") return <Film color={color} size={16} />;
  return <Clapperboard color={color} size={16} />;
}

interface Props {
  contentTitle: string;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
}

export function PromoVideoBar({ contentTitle, promoVideos, comingSoon }: Props) {
  const [active, setActive] = useState<PromoVideo | null>(null);
  const actions = buildPromoActions(promoVideos, { comingSoon });

  if (!actions.length) return null;

  return (
    <>
      <View style={styles.row}>
        {actions.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            style={styles.chip}
            onPress={() => setActive(promo)}
            activeOpacity={0.85}
          >
            <PromoIcon typeCode={promo.typeCode} />
            <Text style={styles.chipText}>{promo.displayLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {active ? (
        <PromoPlayerModal
          promo={active}
          contentTitle={contentTitle}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chipText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
});
