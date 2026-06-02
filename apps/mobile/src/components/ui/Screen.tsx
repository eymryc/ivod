import type { ComponentProps } from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

interface ScreenProps extends ViewProps {
  edges?: ("top" | "bottom" | "left" | "right")[];
  padded?: boolean;
}

type SafeAreaStyle = ComponentProps<typeof SafeAreaView>["style"];

export function Screen({ children, edges = ["top"], padded = true, style, ...rest }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, style] as SafeAreaStyle} {...rest}>
      <View style={[styles.inner, padded ? styles.padded : undefined]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 16 },
});
