import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface PremiumOfferCardProps {
  onPress: () => void;
}

export function PremiumOfferCard({ onPress }: PremiumOfferCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.wrap}>
      <LinearGradient
        colors={["rgba(123,0,153,0.2)", "rgba(0,5,13,0.85)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.borderGlow} pointerEvents="none" />
      <View style={styles.inner}>
        <GradientText style={styles.kicker}>Offres</GradientText>
        <Text style={styles.title}>Passes & Premium</Text>
        <Text style={styles.sub}>Gratuit avec pub · Pass 24h · Premium sans pub</Text>
        <View style={styles.cta}>
          <LinearGradient
            colors={[...gradients.primaryBtn]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGrad}
          >
            <Text style={styles.ctaText}>Voir les offres</Text>
            <ChevronRight color="#fff" size={16} />
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: layout.pagePaddingX,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.3)",
    overflow: "hidden",
    minHeight: 140,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,123,0,0.15)",
  },
  inner: { padding: 20, gap: 6 },
  kicker: { fontSize: 10, letterSpacing: 2.4 },
  title: { ...typography.h2, fontSize: 22 },
  sub: { ...typography.bodyMuted, marginTop: 2 },
  cta: { marginTop: 14, alignSelf: "flex-start" },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
