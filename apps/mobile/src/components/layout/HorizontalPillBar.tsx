import type { ReactNode } from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { layout } from "@/theme/layout";

interface HorizontalPillBarProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Barre de filtres horizontale — hauteur fixe, pas d’étirement vertical */
export function HorizontalPillBar({ children, style }: HorizontalPillBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.bar, style]}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
    marginBottom: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.pagePaddingX,
    gap: 8,
    paddingVertical: 2,
  },
});
