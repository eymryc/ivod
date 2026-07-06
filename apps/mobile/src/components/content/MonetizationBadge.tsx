import { View, Text, StyleSheet } from "react-native";
import {
  viewerOfferLabel,
  viewerOfferBadgeColor,
  viewerOfferBadgeTextColor,
  shouldShowOfferBadgeOnCard,
} from "@/core/constants/monetization";

export function MonetizationBadge({
  visibility,
  monetization,
  ppvPrice,
  isAuthenticated = false,
}: {
  visibility?: string | null;
  monetization?: string | null;
  ppvPrice?: number | null;
  isAuthenticated?: boolean;
}) {
  const vis = visibility ?? monetization ?? null;
  const offerLabel = viewerOfferLabel(vis, ppvPrice);

  if (!shouldShowOfferBadgeOnCard(isAuthenticated, vis, offerLabel)) {
    return null;
  }

  return (
    <View style={[styles.badge, { backgroundColor: viewerOfferBadgeColor(vis) }]}>
      <Text style={[styles.text, { color: viewerOfferBadgeTextColor(vis) }]}>{offerLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 9, fontWeight: "700" },
});
