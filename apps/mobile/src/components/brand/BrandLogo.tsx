import { View, Image, StyleSheet, type ViewStyle } from "react-native";
import { shadows } from "@/theme/shadows";

/** Même asset que le web : apps/web/public/logo/logo_sans_fond.png */
const LOGO_SOURCE = require("../../../assets/logo/logo_sans_fond.png");

const SIZES = {
  sm: { height: 36, width: 90 },
  md: { height: 48, width: 120 },
  lg: { height: 64, width: 160 },
} as const;

export function BrandLogo({
  size = "md",
  style,
}: {
  size?: keyof typeof SIZES;
  style?: ViewStyle;
}) {
  const dim = SIZES[size];
  return (
    <View style={[styles.wrap, shadows.card, style]}>
      <Image
        source={LOGO_SOURCE}
        style={{ height: dim.height, width: dim.width }}
        resizeMode="contain"
        accessibilityLabel="iVOD"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#e6007e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
});
