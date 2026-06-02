import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Crown,
  History,
  Download,
  LogOut,
  Bell,
  Shield,
  Smartphone,
  Users,
  Sparkles,
  Radio,
  CreditCard,
  Baby,
  Lock,
  RotateCcw,
} from "lucide-react-native";
import { usersApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { AmbientOrbs } from "@/components/layout/AmbientOrbs";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { MenuRow } from "@/components/layout/MenuRow";
import { AccentLine } from "@/components/layout/AccentLine";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function ProfilScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const activeProfile = useProfileStore((s) => s.getActiveProfile());

  useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <PageCanvas>
        <AmbientOrbs />
        <View style={styles.guest}>
          <BrandLogo size="lg" />
          <AccentLine width={48} style={{ marginVertical: 16 }} />
          <Text style={styles.guestTitle}>Mon compte</Text>
          <Text style={styles.guestText}>
            Connectez-vous pour gérer abonnement, historique et appareils.
          </Text>
          <PremiumPanel style={styles.guestPanel}>
            <Button title="Se connecter" onPress={() => router.push("/(auth)/login")} />
            <Button
              title="Créer un compte"
              variant="secondary"
              onPress={() => router.push("/(auth)/register")}
            />
          </PremiumPanel>
        </View>
      </PageCanvas>
    );
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || user?.email;

  const menu = [
    { icon: Users, label: "Mon compte", href: "/settings" },
    { icon: Users, label: "Changer de profil", sub: activeProfile?.name, href: "/(profiles)/select?mode=switch" },
    { icon: Crown, label: "Abonnement", sub: "Passes & Premium", href: "/settings/subscription" },
    { icon: History, label: "Historique", href: "/settings/history" },
    { icon: Download, label: "Téléchargements", href: "/(tabs)/downloads" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Smartphone, label: "Appareils", href: "/settings/devices" },
    { icon: Shield, label: "Sécurité", href: "/settings/security" },
  ];

  const menuExtra = [
    { icon: Sparkles, label: "Pour vous", href: "/recommendations" },
    { icon: Users, label: "Créateurs suivis", href: "/following" },
    { icon: Radio, label: "Live", href: "/live" },
    { icon: CreditCard, label: "Tarifs", href: "/pricing" },
    { icon: RotateCcw, label: "Remboursements", href: "/settings/refunds" },
    { icon: Baby, label: "Contrôle parental", href: "/settings/parental" },
    { icon: Lock, label: "Confidentialité", href: "/settings/privacy" },
  ];

  return (
    <PageCanvas>
      <AmbientOrbs />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TabPageHeader title="Mon compte" subtitle={user?.email} kicker="Profil" />

        <PremiumPanel style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
        </PremiumPanel>

        <View style={styles.menu}>
          {menu.map((item) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              subtitle={item.sub}
              onPress={() => router.push(item.href as never)}
            />
          ))}
          {menuExtra.map((item) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              onPress={() => router.push(item.href as never)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.logout}
          onPress={() =>
            Alert.alert("Déconnexion", "Confirmer ?", [
              { text: "Annuler", style: "cancel" },
              {
                text: "Déconnecter",
                style: "destructive",
                onPress: async () => {
                  await logout();
                  await useProfileStore.getState().clearProfiles();
                  router.replace("/(auth)/login");
                },
              },
            ])
          }
        >
          <LogOut color={colors.error} size={18} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={{ height: layout.tabBarOffset }} />
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  guest: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: layout.pagePaddingXMd * 2,
    gap: 8,
  },
  guestPanel: { width: "100%", maxWidth: 360, marginTop: 8 },
  guestTitle: { ...typography.h2 },
  guestText: { ...typography.bodyMuted, textAlign: "center", maxWidth: 300 },
  profileCard: { marginHorizontal: layout.pagePaddingX, marginBottom: 16, alignItems: "center" },
  avatar: {
    width: 72,
    height: 72,
    backgroundColor: "rgba(230,0,126,0.2)",
    borderWidth: 2,
    borderColor: colors.magenta,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.foreground },
  name: { ...typography.h2, fontSize: 20 },
  email: { ...typography.caption, marginTop: 4 },
  menu: { paddingHorizontal: layout.pagePaddingX, marginTop: 8 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: layout.pagePaddingX,
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  logoutText: { color: colors.error, fontWeight: "600" },
});
