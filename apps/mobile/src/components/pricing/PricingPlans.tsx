import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Tv, Sparkles, Shield, Smartphone } from "lucide-react-native";
import { subscriptionsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { PlanCard } from "@/components/pricing/PlanCard";
import { PricingFaq } from "@/components/pricing/PricingFaq";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { homeApi } from "@/infrastructure/api";
import type { HomeConfig } from "@/infrastructure/api";
import { formatXOF } from "@/core/pricing/format";
import { navigatePlanCta } from "@/presentation/utils/pricing-navigation";
import type { SubscriptionPlan } from "@/core/pricing/types";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface PricingPlansProps {
  variant?: "full" | "compact";
  isAuthenticated?: boolean;
  activePlanCode?: string;
  showFree?: boolean;
  showTvod?: boolean;
  showFaq?: boolean;
  hasActiveSubscription?: boolean;
  onPlanSelect?: (plan: SubscriptionPlan) => void;
}

export function PricingPlans({
  variant = "full",
  isAuthenticated = false,
  activePlanCode = "FREE",
  showFree = true,
  showTvod = true,
  showFaq = false,
  hasActiveSubscription = false,
  onPlanSelect,
}: PricingPlansProps) {
  const router = useRouter();
  const isFull = variant === "full";

  const { data: allPlans, isLoading } = useQuery({
    queryKey: [...QueryKeys.subscription.plans(), 'all'],
    queryFn: () => subscriptionsApi.getAllPlans(),
    staleTime: 60 * 60_000,
  });

  const { data: homeConfig } = useQuery({
    queryKey: ['home-config'],
    queryFn: (): Promise<HomeConfig> => homeApi.getConfig(),
    staleTime: 60 * 60_000,
  });
  const ppvSuggestions: number[] = homeConfig?.ppvPriceSuggestions ?? [300, 500, 1000, 1500, 2000];

  const rawPlans = (Array.isArray(allPlans) ? allPlans : []) as unknown as SubscriptionPlan[];
  const freePlan = rawPlans.find((p) => p.code === 'FREE');
  const paidPlans = rawPlans.filter((p) => p.code !== 'FREE');
  const displayPlans = isFull ? (showFree && freePlan ? [freePlan, ...paidPlans] : paidPlans) : paidPlans;

  const paidSubscriptionActive =
    isAuthenticated && hasActiveSubscription && activePlanCode !== "FREE";

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.magenta} />
      </View>
    );
  }

  return (
    <View style={isFull ? styles.fullGap : styles.compactGap}>
      {displayPlans.map((plan) => (
        <PlanCard
          key={plan.code}
          plan={plan}
          visual="pricing"
          recommended={plan.code === "PREMIUM"}
          isActive={paidSubscriptionActive && activePlanCode === plan.code}
          disabled={
            paidSubscriptionActive && plan.code !== "FREE" && plan.code !== activePlanCode
          }
          disabledCtaLabel="Abonnement en cours"
          ctaContext={onPlanSelect ? "settings" : "browse"}
          onSelect={() =>
            onPlanSelect ? onPlanSelect(plan) : navigatePlanCta(router, plan.code, isAuthenticated)
          }
        />
      ))}

      {variant === "compact" ? (
        <TouchableOpacity style={styles.compareLink} onPress={() => router.push("/pricing")}>
          <GradientText style={styles.compareLinkText}>Comparer toutes les offres →</GradientText>
        </TouchableOpacity>
      ) : null}

      {showTvod && isFull ? (
        <View style={styles.tvodPanel}>
          <View style={styles.tvodIcon}>
            <Tv color={colors.magenta} size={24} strokeWidth={1.5} />
          </View>
          <View style={styles.tvodBody}>
            <Text style={styles.tvodKicker}>TVOD · À l&apos;unité</Text>
            <Text style={styles.tvodTitle}>Un film, un prix — sans abonnement</Text>
            <Text style={styles.tvodDesc}>
              Certains titres et événements live sont disponibles en achat unique. Payez une fois,
              regardez autant de fois que vous voulez.
            </Text>
            <Text style={styles.tvodPrices}>
              {ppvSuggestions.map((p: number) => formatXOF(p)).join(" · ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/browse")} activeOpacity={0.85}>
            <LinearGradient
              colors={[...gradients.primaryBtn]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tvodCta}
            >
              <Text style={styles.tvodCtaText}>Explorer le catalogue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      {isFull ? (
        <View style={styles.trustStrip}>
          <View style={styles.trustItem}>
            <Shield color={colors.magenta} size={15} />
            <Text style={styles.trustText}>Paiement sécurisé Paystack</Text>
          </View>
          <View style={styles.trustItem}>
            <Smartphone color={colors.orange} size={15} />
            <Text style={styles.trustText}>Mobile Money via Paystack</Text>
          </View>
          <View style={styles.trustItem}>
            <Sparkles color={colors.gold} size={15} />
            <Text style={styles.trustText}>Montants en FCFA · UEMOA</Text>
          </View>
        </View>
      ) : null}

      {showFaq && isFull ? (
        <View style={styles.faqSection}>
          <View style={styles.sectionHead}>
            <GradientText style={styles.sectionKicker}>FAQ</GradientText>
            <Text style={styles.sectionTitle}>Questions fréquentes</Text>
            <AccentLine width={40} style={{ marginTop: 8 }} />
          </View>
          <PricingFaq />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: "center" },
  fullGap: { gap: 0 },
  compactGap: { gap: 8 },
  compareLink: { alignItems: "center", paddingVertical: 12 },
  compareLinkText: { fontSize: 14, fontWeight: "600" },
  tvodPanel: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.25)",
    backgroundColor: "rgba(123,0,153,0.12)",
    gap: 14,
  },
  tvodIcon: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tvodBody: { gap: 6 },
  tvodKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.orange,
  },
  tvodTitle: { fontSize: 18, fontWeight: "600", color: colors.foreground },
  tvodDesc: { ...typography.bodyMuted, lineHeight: 20 },
  tvodPrices: { fontSize: 12, color: colors.mutedDim, marginTop: 4 },
  tvodCta: { paddingVertical: 12, alignItems: "center" },
  tvodCtaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  trustStrip: {
    marginHorizontal: 16,
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustText: { fontSize: 12, color: colors.muted },
  faqSection: { marginTop: 32, gap: 16 },
  sectionHead: { alignItems: "center", paddingHorizontal: 16 },
  sectionKicker: { fontSize: 11, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },
  sectionTitle: { fontSize: 20, fontWeight: "600", color: colors.foreground, marginTop: 6 },
});
