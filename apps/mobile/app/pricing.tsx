import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { subscriptionsApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { PricingCompareTable } from "@/components/pricing/PricingCompareTable";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function PricingScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: () => subscriptionsApi.getActive(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ["subscription-plans-all"],
    queryFn: () => subscriptionsApi.getAllPlans(),
    staleTime: 60 * 60_000,
  });

  const priceChips = (allPlans as any[])
    .filter((p) => p.code !== "FREE" && p.priceFcfaMonthly > 0)
    .map((p) => ({
      label: p.label as string,
      value: p.billingDays >= 30
        ? `${(p.priceFcfaMonthly as number).toLocaleString("fr-CI")} FCFA/mois`
        : `${(p.priceFcfaMonthly as number).toLocaleString("fr-CI")} FCFA`,
      highlight: p.code === "PREMIUM",
    }));

  const planCode = (currentSub as { plan?: string })?.plan ?? "FREE";
  const hasPaidPlan =
    isAuthenticated &&
    planCode !== "FREE" &&
    !!(currentSub as { hasActiveSubscription?: boolean })?.hasActiveSubscription;

  const headerAction = !isAuthenticated ? (
    <TouchableOpacity onPress={() => router.push("/(auth)/register")} activeOpacity={0.85}>
      <LinearGradient
        colors={[...gradients.primaryBtn]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBtn}
      >
        <Text style={styles.headerBtnText}>Commencer</Text>
      </LinearGradient>
    </TouchableOpacity>
  ) : hasPaidPlan ? (
    <TouchableOpacity
      style={styles.headerBtnOutline}
      onPress={() => router.push("/settings/subscription")}
    >
      <Text style={styles.headerBtnOutlineText}>Gérer</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/settings/subscription", params: { plan: "PREMIUM" } })
      }
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[...gradients.primaryBtn]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBtn}
      >
        <Crown color="#fff" size={14} />
        <Text style={styles.headerBtnText}>Premium</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <PageCanvas>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TabPageHeader
          showBack
          kicker="Offres iVOD"
          title="Choisissez votre expérience"
          subtitle="Gratuit avec pub, micro-paiement 24h ou 7 jours, ou Premium mensuel — tout en FCFA, paiement sécurisé (Mobile Money & carte selon disponibilité)."
          action={headerAction}
        />

        <View style={styles.chipsRow}>
          {priceChips.map((chip) => (
            <View
              key={chip.label}
              style={[styles.chip, chip.highlight && styles.chipHighlight]}
            >
              <Text style={styles.chipLabel}>{chip.label}</Text>
              {chip.highlight ? (
                <GradientText style={styles.chipValue}>{chip.value}</GradientText>
              ) : (
                <Text style={styles.chipValue}>{chip.value}</Text>
              )}
            </View>
          ))}
        </View>

        <PricingPlans
          variant="full"
          isAuthenticated={isAuthenticated}
          activePlanCode={planCode}
          hasActiveSubscription={hasPaidPlan}
          showFree
          showTvod
          showFaq
        />

        <View style={styles.compareSection}>
          <View style={styles.sectionHead}>
            <GradientText style={styles.sectionKicker}>Comparatif</GradientText>
            <Text style={styles.sectionTitle}>Gratuit vs abonnés</Text>
            <AccentLine width={40} style={{ marginTop: 8 }} />
          </View>
          <PricingCompareTable />
        </View>

        <View style={styles.footerCta}>
          <Crown color={colors.gold} size={28} strokeWidth={1.25} style={{ alignSelf: "center" }} />
          <GradientText style={styles.footerKicker}>Prêt à regarder ?</GradientText>
          <Text style={styles.footerTitle}>Le meilleur du cinéma africain vous attend</Text>
          <View style={styles.footerBtns}>
            <TouchableOpacity onPress={() => router.push("/browse")} activeOpacity={0.85}>
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.footerBtnPrimary}
              >
                <Text style={styles.footerBtnPrimaryText}>Explorer les films</Text>
              </LinearGradient>
            </TouchableOpacity>
            {!isAuthenticated ? (
              <TouchableOpacity
                style={styles.footerBtnOutline}
                onPress={() => router.push("/(auth)/login")}
              >
                <Text style={styles.footerBtnOutlineText}>Se connecter</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  headerBtnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  headerBtnOutlineText: { color: colors.foreground, fontWeight: "600", fontSize: 13 },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: layout.pagePaddingX,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    minWidth: 100,
  },
  chipHighlight: {
    borderColor: "rgba(230,0,126,0.4)",
    backgroundColor: "rgba(123,0,153,0.15)",
  },
  chipLabel: typography.fieldLabel,
  chipValue: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  compareSection: { marginTop: 32, gap: 16 },
  sectionHead: { alignItems: "center", paddingHorizontal: layout.pagePaddingX },
  sectionKicker: typography.kicker,
  sectionTitle: { fontSize: 20, fontWeight: "600", color: colors.foreground, marginTop: 6 },
  footerCta: {
    marginHorizontal: layout.pagePaddingX,
    marginTop: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    gap: 10,
  },
  footerKicker: typography.kicker,
  footerTitle: { ...typography.h3, textAlign: "center", marginBottom: 8 },
  footerBtns: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  footerBtnPrimary: { paddingHorizontal: 20, paddingVertical: 12 },
  footerBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  footerBtnOutline: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  footerBtnOutlineText: { color: colors.foreground, fontWeight: "600", fontSize: 14 },
});
