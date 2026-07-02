import { View, StyleSheet, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

type PremiumPanelProps = ViewProps & {
  variant?: "default" | "hero";
};

/** Panneau glass — équivalent web .settings-panel */
export function PremiumPanel({ children, style, variant = "default", ...rest }: PremiumPanelProps) {
  return (
    <View
      style={[
        styles.wrap,
        variant === "hero" && styles.wrapHero,
        shadows.panel,
        style,
      ]}
      {...rest}
    >
      <LinearGradient
        colors={
          variant === "hero"
            ? ["rgba(123,0,153,0.16)", "rgba(0,5,13,0.72)", "rgba(255,123,0,0.06)"]
            : ["rgba(123,0,153,0.08)", "rgba(0,5,13,0.55)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {variant === "default" ? (
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topAccent}
        />
      ) : null}
      <View style={[styles.inner, variant === "hero" && styles.innerHero]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    borderRadius: 4,
  },
  wrapHero: {
    borderColor: "rgba(230,0,126,0.28)",
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  inner: { padding: 20, gap: 12 },
  innerHero: { paddingBottom: 22 },
});
