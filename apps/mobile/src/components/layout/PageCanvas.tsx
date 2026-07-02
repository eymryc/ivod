import { View, StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AmbientOrbs } from "./AmbientOrbs";
import { colors } from "@/theme/colors";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Désactiver fond décoratif (lecteur, home hero plein écran) */
  minimal?: boolean;
}

/** Fond page premium — équivalent `.page-canvas` */
export function PageCanvas({ children, style, minimal }: Props) {
  return (
    <View style={[styles.root, style]}>
      {!minimal ? (
        <>
          <AmbientOrbs />
          <LinearGradient
            colors={["rgba(18,32,52,0.48)", "transparent"]}
            style={styles.glowTopLeft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={["rgba(12,22,38,0.28)", "transparent"]}
            style={styles.glowTopRight}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,2,6,0.88)"]}
            style={styles.glowBottom}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <LinearGradient
            colors={[colors.backgroundElevated, colors.background, "#000308"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.42, 1]}
          />
        </>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glowTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "45%",
    opacity: 0.9,
  },
  glowTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "55%",
    height: "35%",
  },
  glowBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  content: { flex: 1 },
});
