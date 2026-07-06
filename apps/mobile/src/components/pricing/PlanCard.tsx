import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, Star, Zap, Calendar } from "lucide-react-native";
import type { SubscriptionPlan } from "@/core/pricing/types";
import { formatXOF, planPeriodLabel } from "@/core/pricing/format";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { shadows } from "@/theme/shadows";

const QUALITY_LABELS: Record<string, string> = { SD: "SD", HD: "HD", FHD: "Full HD" };

const PLAN_ICON: Record<string, typeof Crown> = {
  PREMIUM: Crown,
  PASS_24H: Zap,
  PASS_WEEK: Calendar,
};

interface PlanCardProps {
  plan: SubscriptionPlan;
  isActive?: boolean;
  recommended?: boolean;
  onSelect: () => void;
  disabled?: boolean;
  disabledCtaLabel?: string;
  visual?: "default" | "pricing";
  ctaContext?: "browse" | "settings";
  /** Sans marge horizontale (panneau settings) */
  embedded?: boolean;
}

function buildFeatures(plan: SubscriptionPlan): string[] {
  return [
    plan.tagline,
    `${plan.maxScreens} écran${plan.maxScreens > 1 ? "s" : ""} simultané${plan.maxScreens > 1 ? "s" : ""}`,
    `Qualité ${QUALITY_LABELS[plan.videoQuality] ?? plan.videoQuality}`,
    plan.hasAds ? "Avec publicité" : "Sans publicité",
    plan.hasExclusiveAccess ? "Exclusivités incluses" : null,
    ...(plan.features ?? []),
  ].filter(Boolean) as string[];
}

export function PlanCard({
  plan,
  isActive,
  recommended,
  onSelect,
  disabled,
  disabledCtaLabel = "Abonnement en cours",
  visual = "pricing",
  ctaContext = "browse",
  embedded,
}: PlanCardProps) {
  const isFree = plan.priceFcfaMonthly === 0;
  const period = planPeriodLabel(plan.billingDays ?? 30);
  const isPremium = plan.code === "PREMIUM" || recommended;
  const isPricing = visual === "pricing";
  const PlanIcon = PLAN_ICON[plan.code];
  const features = buildFeatures(plan);

  const ctaLabel = isActive
    ? "Plan actuel"
    : disabled && !isActive
      ? disabledCtaLabel
      : isFree
        ? "Compte gratuit"
        : ctaContext === "settings"
          ? "Payer"
          : `Choisir · ${plan.label}`;

  const cardStyle = [
    styles.wrap,
    embedded && styles.wrapEmbedded,
    isPricing && isPremium && styles.wrapPremium,
    isPricing && plan.code === "PASS_24H" && styles.wrapPass24,
    isPricing && plan.code === "PASS_WEEK" && styles.wrapPassWeek,
    isPricing && isFree && styles.wrapFree,
    !isPricing && recommended && styles.wrapPopular,
    shadows.card,
  ];

  return (
    <View style={cardStyle}>
      {recommended ? (
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.popularBadge}
        >
          <Star color="#fff" size={10} fill="#fff" />
          <Text style={styles.popularText}>Le plus populaire</Text>
        </LinearGradient>
      ) : null}

      {isActive ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Actif</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        {PlanIcon ? (
          <View style={[styles.iconBox, isPremium && styles.iconBoxPremium]}>
            <PlanIcon
              size={17}
              color={isPremium ? colors.gold : colors.magenta}
              strokeWidth={1.75}
            />
          </View>
        ) : null}
        <Text style={styles.label}>{plan.label}</Text>
      </View>

      {isFree ? (
        <Text style={styles.price}>Gratuit</Text>
      ) : (
        <>
          <Text style={[styles.price, isPremium && styles.pricePremium]}>{formatXOF(plan.priceFcfaMonthly)}</Text>
          <Text style={styles.period}>/ {period}</Text>
        </>
      )}

      <View style={styles.features}>
        {features.map((f) => {
          const muted = f.includes("publicité") && f.startsWith("Avec");
          return (
            <View key={f} style={styles.featureRow}>
              <Check color={isPremium ? colors.gold : colors.magenta} size={14} />
              <Text style={[styles.featureText, muted && styles.featureMuted]}>{f}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={onSelect}
        disabled={disabled || isActive}
        activeOpacity={0.85}
      >
        {isActive ? (
          <View style={styles.ctaActive}>
            <Text style={styles.ctaActiveText}>{ctaLabel}</Text>
          </View>
        ) : isPremium ? (
          <LinearGradient
            colors={[...gradients.primaryBtn]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.cta, (disabled || isActive) && styles.ctaDisabled]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.ctaOutline, (disabled || isActive) && styles.ctaDisabled]}>
            <Text style={styles.ctaOutlineText}>{ctaLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.85)",
    gap: 6,
  },
  wrapEmbedded: { marginHorizontal: 0 },
  wrapPopular: {
    borderColor: "rgba(230,0,126,0.45)",
    backgroundColor: "rgba(123,0,153,0.06)",
  },
  wrapPremium: {
    borderColor: "rgba(255,179,0,0.35)",
    backgroundColor: "rgba(123,0,153,0.1)",
  },
  wrapPass24: { borderColor: "rgba(230,0,126,0.25)" },
  wrapPassWeek: { borderColor: "rgba(255,123,0,0.25)" },
  wrapFree: { borderColor: "rgba(255,255,255,0.1)" },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  activeBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(52,211,153,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  iconBox: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  iconBoxPremium: {
    borderColor: "rgba(255,179,0,0.4)",
    backgroundColor: "rgba(123,0,153,0.25)",
  },
  label: { ...typography.h3, fontSize: 16, flex: 1 },
  price: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 4,
  },
  pricePremium: { color: colors.gold },
  period: {
    fontSize: 11,
    color: colors.mutedDim,
    marginBottom: 4,
  },
  features: { gap: 8, marginVertical: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { ...typography.bodyMuted, flex: 1, fontSize: 13 },
  featureMuted: { color: colors.mutedDim },
  cta: { marginTop: 8, paddingVertical: 14, alignItems: "center" },
  ctaOutline: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ctaActive: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.4)",
    backgroundColor: "rgba(52,211,153,0.1)",
  },
  ctaActiveText: { color: colors.success, fontWeight: "700", fontSize: 14 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ctaOutlineText: { color: colors.foreground, fontWeight: "700", fontSize: 15 },
});
