import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "./BackButton";
import { AccentLine } from "./AccentLine";
import { GradientText } from "./GradientText";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface TabPageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  action?: ReactNode;
  /** Flèche retour (pages stack hors onglets) */
  showBack?: boolean;
}

/** En-tête onglets — titre à gauche, pas de logo géant centré */
export function TabPageHeader({
  title,
  subtitle,
  kicker = "iVOD",
  action,
  showBack = false,
}: TabPageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, showBack ? styles.wrapStack : { paddingTop: insets.top + 6 }]}>
      {showBack ? <BackButton safeTop /> : null}
      <View style={styles.titleRow}>
        <View style={styles.body}>
          <GradientText style={styles.kicker}>{kicker}</GradientText>
          <Text style={styles.title}>{title}</Text>
          <AccentLine width={56} style={styles.line} />
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.pagePaddingX,
    paddingBottom: 14,
  },
  wrapStack: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: layout.pagePaddingX,
  },
  body: { flex: 1, alignItems: "flex-start", gap: 4, minWidth: 0 },
  kicker: { fontSize: 10, letterSpacing: 2.8 },
  title: {
    ...typography.h1,
    fontSize: 28,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  line: { marginVertical: 8 },
  subtitle: { ...typography.bodyMuted, maxWidth: 320, lineHeight: 20 },
  action: { flexShrink: 0, marginBottom: 4 },
});
