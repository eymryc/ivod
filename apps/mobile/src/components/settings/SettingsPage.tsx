import { ScrollView, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/SettingsShell";

interface SettingsPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

/** Contenu d’une sous-page réglages dans un panneau premium */
export function SettingsPage({ title, description, icon, children }: SettingsPageProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <SettingsPanel>
        <SettingsSectionHeader title={title} description={description} icon={icon} />
        {children}
      </SettingsPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
});
