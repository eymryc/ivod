import { View, StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "@/theme/colors";

interface Props {
  width?: number | `${number}%`;
  style?: ViewStyle;
}

/** Ligne accent dégradée — équivalent `.ivod-line-accent` */
export function AccentLine({ width = 48, style }: Props) {
  return (
    <View style={[styles.wrap, { width }, style]}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 2, overflow: "hidden" },
});
