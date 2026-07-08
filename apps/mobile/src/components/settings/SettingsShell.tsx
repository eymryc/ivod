import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, usePathname, type Href } from "expo-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { layout } from "@/theme/layout";
import {
  User,
  Shield,
  Monitor,
  History,
  CreditCard,
  Baby,
  Lock,
  ChevronRight,
  Clapperboard,
} from "lucide-react-native";
import { BackButton } from "@/components/layout/BackButton";
import type { LucideIcon } from "lucide-react-native";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { AccentLine } from "@/components/layout/AccentLine";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { shadows } from "@/theme/shadows";
import { useAuthStore } from "@/store/auth.store";

const BASE_NAV: { href: Href; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "Mon profil", description: "Identité et email", icon: User },
  { href: "/settings/subscription", label: "Abonnement", description: "Plan et factures", icon: CreditCard },
  { href: "/settings/history", label: "Historique", description: "Visionnages", icon: History },
  { href: "/settings/security", label: "Sécurité", description: "Mot de passe", icon: Shield },
  { href: "/settings/devices", label: "Appareils", description: "Sessions", icon: Monitor },
  { href: "/settings/login-history", label: "Connexions", description: "Historique", icon: Monitor },
  { href: "/settings/parental", label: "Parental", description: "Restrictions", icon: Baby },
  { href: "/settings/privacy", label: "Confidentialité", description: "RGPD", icon: Lock },
];

const CREATOR_NAV_ITEM = {
  href: "/settings/creator" as Href,
  label: "Profil créateur",
  description: "Nom de scène et bio",
  icon: Clapperboard,
};

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const userRole = useAuthStore((s) => s.user?.role);
  const isCreatorAccount = userRole === "CREATOR" || userRole === "ADMIN";
  const nav = isCreatorAccount
    ? [...BASE_NAV.slice(0, 1), CREATOR_NAV_ITEM, ...BASE_NAV.slice(1)]
    : BASE_NAV;
  return (
    <PageCanvas>
      <View style={styles.root}>
        <BackButton label="Retour au profil" onPress={() => router.push("/(tabs)/profil")} />

        <View style={styles.header}>
          <BrandLogo size="sm" />
          <Text style={[typography.h1, { marginTop: 10 }]}>Paramètres</Text>
          <AccentLine width={56} style={{ marginVertical: 12 }} />
          <Text style={typography.bodyMuted}>
            Gérez votre profil, abonnement, sécurité et confidentialité.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
          <View style={styles.navRow}>
            {nav.map(({ href, label, description, icon: Icon }) => {
              const hrefStr = String(href);
              const active =
                hrefStr === "/settings"
                  ? pathname === "/settings"
                  : pathname.startsWith(hrefStr);
              return (
                <TouchableOpacity
                  key={hrefStr}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => router.push(href)}
                >
                  <View style={[styles.navIcon, active && styles.navIconActive]}>
                    <Icon color={active ? colors.magenta : colors.muted} size={18} />
                  </View>
                  <View style={styles.navText}>
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
                    <Text style={styles.navDesc} numberOfLines={1}>
                      {description}
                    </Text>
                  </View>
                  <ChevronRight color={colors.muted} size={16} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.panel}>{children}</View>
      </View>
    </PageCanvas>
  );
}

export function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <View style={[panelStyles.panel, shadows.panel]}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={panelStyles.panelAccent}
      />
      <LinearGradient
        colors={["rgba(123,0,153,0.1)", "rgba(0,5,13,0.65)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={panelStyles.panelInner}>{children}</View>
    </View>
  );
}

export function SettingsSectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <View style={panelStyles.sectionHead}>
      {Icon ? (
        <View style={panelStyles.iconBox}>
          <Icon color={colors.magenta} size={17} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={typography.h3}>{title}</Text>
        {description ? <Text style={[typography.bodyMuted, { marginTop: 6 }]}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 8 },
  navScroll: { maxHeight: 108, marginBottom: 8 },
  navRow: { flexDirection: "row", paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 188,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 4,
  },
  navItemActive: {
    borderColor: "rgba(230,0,126,0.4)",
    backgroundColor: "rgba(123,0,153,0.12)",
  },
  navIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: {
    borderColor: "rgba(230,0,126,0.4)",
    backgroundColor: "rgba(123,0,153,0.2)",
  },
  navText: { flex: 1, minWidth: 0 },
  navLabel: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  navLabelActive: { color: colors.foreground },
  navDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  panel: { flex: 1, paddingHorizontal: layout.pagePaddingX, paddingBottom: 24 },
});

const panelStyles = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.2)",
    backgroundColor: "rgba(10,16,24,0.72)",
    borderRadius: layout.radiusSm,
    overflow: "hidden",
  },
  panelAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  panelInner: {
    padding: 20,
    gap: 12,
  },
  sectionHead: { flexDirection: "row", gap: 12, marginBottom: 16 },
  iconBox: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.25)",
    backgroundColor: "rgba(123,0,153,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
