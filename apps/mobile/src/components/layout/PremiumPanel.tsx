import { View, StyleSheet, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

/** Panneau glass — équivalent web .settings-panel */
export function PremiumPanel({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.wrap, shadows.panel, style]} {...rest}>
      <LinearGradient
        colors={["rgba(123,0,153,0.08)", "rgba(0,5,13,0.55)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  inner: { padding: 20, gap: 12 },
});
