import { View, Text, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { AccentLine } from "@/components/layout/AccentLine";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface SettingsFormSectionProps {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bloc formulaire réglages — kicker + panneau premium */
export function SettingsFormSection({ kicker, title, description, children }: SettingsFormSectionProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      <AccentLine width={40} style={{ marginTop: 10, marginBottom: 12 }} />
      <PremiumPanel style={styles.panel}>{children}</PremiumPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  kicker: { ...typography.kicker, marginBottom: 4 },
  title: { ...typography.h3 },
  desc: { ...typography.bodyMuted, marginTop: 6, maxWidth: layout.maxFormWidth },
  panel: { gap: 14, padding: 16 },
});
