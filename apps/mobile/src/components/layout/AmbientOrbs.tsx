import { View, StyleSheet } from "react-native";

/** Halos flottants — ambiance premium sur toutes les pages */
export function AmbientOrbs() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.orb, styles.orbPurple]} />
      <View style={[styles.orb, styles.orbMagenta]} />
      <View style={[styles.orb, styles.orbGold]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPurple: {
    width: 280,
    height: 280,
    top: "12%",
    right: -90,
    backgroundColor: "rgba(123,0,153,0.32)",
    opacity: 0.55,
  },
  orbMagenta: {
    width: 200,
    height: 200,
    bottom: "22%",
    left: -55,
    backgroundColor: "rgba(230,0,126,0.26)",
    opacity: 0.5,
  },
  orbGold: {
    width: 140,
    height: 140,
    top: "42%",
    left: "38%",
    backgroundColor: "rgba(255,123,0,0.14)",
    opacity: 0.45,
  },
});
