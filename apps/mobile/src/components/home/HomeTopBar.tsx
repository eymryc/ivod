import type { ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout } from "@/theme/layout";

interface Props {
  right?: ReactNode;
}

/** Barre flottante accueil — actions uniquement (pas de logo, style VOD premium). */
export function HomeTopBar({ right }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <View style={styles.spacer} />
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

export function HomeTopIconButton({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} activeOpacity={0.85}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: layout.pagePaddingX,
    paddingBottom: 8,
  },
  spacer: { flex: 1 },
  right: { flexDirection: "row", gap: 8 },
  iconBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,5,13,0.55)",
  },
});
