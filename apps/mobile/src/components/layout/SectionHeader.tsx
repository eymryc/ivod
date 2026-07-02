import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AccentLine } from "./AccentLine";
import { typography } from "@/theme/typography";

interface Props {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

/** Titre de rail / section — équivalent `PublicSectionHeader` */
export function SectionHeader({ title, subtitle, badge, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <AccentLine width={40} />
        <View style={styles.titles}>
          <Text style={typography.h3}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {badge}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  titles: { flex: 1, gap: 2 },
  subtitle: { ...typography.caption, color: "rgba(255,255,255,0.5)", lineHeight: 16 },
});
