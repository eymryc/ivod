import { View, StyleSheet } from "react-native";

/** Halos flottants — équivalent web HomeContentAmbient */
export function AmbientOrbs() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.orb, styles.orbPurple]} />
      <View style={[styles.orb, styles.orbMagenta]} />
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
    opacity: 0.35,
  },
  orbPurple: {
    width: 220,
    height: 220,
    top: "18%",
    right: -60,
    backgroundColor: "rgba(123,0,153,0.35)",
  },
  orbMagenta: {
    width: 160,
    height: 160,
    bottom: "28%",
    left: -40,
    backgroundColor: "rgba(230,0,126,0.28)",
  },
});
