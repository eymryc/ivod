import { View, StyleSheet, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { layout } from "@/theme/layout";

interface ContentGridProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function ContentGrid({ children, style }: ContentGridProps) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

export function ContentGridCell({ children }: { children: ReactNode }) {
  return <View style={styles.cell}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: layout.pagePaddingX,
    gap: layout.gridGap,
    justifyContent: "space-between",
    paddingBottom: layout.sectionGap,
  },
  cell: {
    width: layout.gridCardWidth,
  },
});
