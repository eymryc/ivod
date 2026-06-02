import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GradientText } from "./GradientText";
import { AccentLine } from "./AccentLine";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface Props {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accentWidth?: number;
  /** Affiche le logo image au lieu du kicker texte */
  brandKicker?: boolean;
  withSafeTop?: boolean;
}

/** En-tête de page — équivalent `PublicPageHeader` */
export function PageHeader({
  kicker = "iVOD",
  title,
  subtitle,
  action,
  accentWidth = 48,
  brandKicker = false,
  withSafeTop = false,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        withSafeTop ? { paddingTop: insets.top + 8 } : null,
      ]}
    >
      <View style={styles.body}>
        {brandKicker ? (
          <BrandLogo size="sm" />
        ) : (
          <GradientText style={typography.kicker}>{kicker}</GradientText>
        )}
        <Text style={typography.h1}>{title}</Text>
        <AccentLine width={accentWidth} style={styles.line} />
        {subtitle ? <Text style={typography.bodyMuted}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: layout.pagePaddingX,
    paddingTop: 8,
    paddingBottom: 4,
  },
  body: { flex: 1, minWidth: 0, gap: 6, alignItems: "flex-start" },
  line: { marginTop: 4, marginBottom: 2 },
  action: { flexShrink: 0 },
});
