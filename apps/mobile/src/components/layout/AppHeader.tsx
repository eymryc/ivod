import type { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface AppHeaderProps {
  subtitle?: string;
  right?: ReactNode;
  logoSize?: "sm" | "md" | "lg";
  showLogo?: boolean;
  /** Fond léger pour lisibilité sur hero image */
  overlay?: boolean;
}

/** Barre supérieure viewer — logo image + actions */
export function AppHeader({
  subtitle,
  right,
  logoSize = "md",
  showLogo = true,
  overlay = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, overlay && styles.wrapOverlay, { paddingTop: insets.top + 8 }]}>
      <View style={styles.left}>
        {showLogo ? <BrandLogo size={logoSize} /> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

export function HeaderIconButton({
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
    justifyContent: "space-between",
    paddingHorizontal: layout.pagePaddingX,
    paddingBottom: 12,
  },
  wrapOverlay: {
    backgroundColor: "rgba(0,5,13,0.35)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  left: { gap: 6 },
  subtitle: { ...typography.caption, marginTop: 2 },
  right: { flexDirection: "row", gap: 8 },
  iconBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,5,13,0.55)",
  },
});
