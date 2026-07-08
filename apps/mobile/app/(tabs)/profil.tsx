import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  History,
  Download,
  LogOut,
  Bell,
  Shield,
  Smartphone,
  Sparkles,
  CreditCard,
  Baby,
  Lock,
  UserCircle,
  Clapperboard,
} from "lucide-react-native";
import { usersApi, subscriptionApi, profilesApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { ProfileAccountSection } from "@/components/profile/ProfileAccountSection";
import { MenuRow } from "@/components/layout/MenuRow";
import { AccentLine } from "@/components/layout/AccentLine";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { useTabBarOffset } from "@/presentation/hooks/use-tab-bar-layout";
import { shouldShowPricingNavLink } from "@/core/navigation/viewer-nav";
import type { LucideIcon } from "lucide-react-native";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  sub?: string;
  href: string;
};

function MenuSection({ title, items, onPress }: { title: string; items: MenuItem[]; onPress: (href: string) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AccentLine width={32} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <PremiumPanel style={styles.sectionPanel}>
        {items.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <View style={styles.sectionDivider} /> : null}
            <MenuRow
              icon={item.icon}
              label={item.label}
              subtitle={item.sub}
              embedded
              onPress={() => onPress(item.href)}
            />
          </View>
        ))}
      </PremiumPanel>
    </View>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const tabBarOffset = useTabBarOffset();
  const { user, isAuthenticated, logout } = useAuthStore();
  const activeProfile = useProfileStore((s) => s.getActiveProfile());

  useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me(),
    enabled: isAuthenticated,
  });

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: () => subscriptionApi.getActive(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => profilesApi.list(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  if (!isAuthenticated) {
    return (
      <PageCanvas>
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

  const planCode =
    currentSub?.planDetails?.code ?? currentSub?.plan ?? currentSub?.planCode ?? "FREE";
  const isPremium = planCode === "PREMIUM";
  const planLabel =
    planCode === "PREMIUM" ? "Premium" : planCode === "BASIC" ? "Basic" : "Gratuit";

  const menuPrimary: MenuItem[] = [
    { icon: UserCircle, label: "Mon compte", href: "/settings" },
    ...(user?.role === "CREATOR" || user?.role === "ADMIN"
      ? [{ icon: Clapperboard, label: "Profil créateur", href: "/settings/creator" }]
      : []),
    { icon: Crown, label: "Abonnement", sub: "Passes & Premium", href: "/settings/subscription" },
    { icon: History, label: "Historique", href: "/settings/history" },
    { icon: Download, label: "Téléchargements", href: "/(tabs)/downloads" },
  ];

  const menuSecondary: MenuItem[] = [
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Smartphone, label: "Appareils", href: "/settings/devices" },
    { icon: Shield, label: "Sécurité", href: "/settings/security" },
    { icon: Sparkles, label: "Pour vous", href: "/recommendations" },
    ...(shouldShowPricingNavLink(isAuthenticated)
      ? [{ icon: CreditCard, label: "Tarifs", href: "/pricing" }]
      : []),
    { icon: Baby, label: "Contrôle parental", href: "/settings/parental" },
    { icon: Lock, label: "Confidentialité", href: "/settings/privacy" },
  ];

  const navigate = (href: string) => router.push(href as never);

  return (
    <PageCanvas>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TabPageHeader title="Mon compte" kicker="Profil" />

        <ProfileAccountSection
          displayName={displayName ?? "Compte"}
          email={user?.email}
          planLabel={planLabel}
          isPremium={isPremium}
          activeProfile={activeProfile}
          profileCount={Array.isArray(profiles) ? profiles.length : 0}
        />

        <MenuSection title="Mon espace" items={menuPrimary} onPress={navigate} />
        <MenuSection title="Préférences" items={menuSecondary} onPress={navigate} />

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
        <View style={{ height: tabBarOffset }} />
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
  section: { marginBottom: 18, paddingHorizontal: layout.pagePaddingX },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  sectionTitle: {
    ...typography.fieldLabel,
    color: "rgba(255,255,255,0.45)",
  },
  sectionPanel: { padding: 0, gap: 0 },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
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
