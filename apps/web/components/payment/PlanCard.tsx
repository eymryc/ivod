import { Check, Crown, Star, Zap, Calendar } from "lucide-react";
import { formatXOF } from "@/lib/utils/format";
import { planPeriodLabel } from "@/lib/constants/monetization";

interface PlanCardProps {
  plan: {
    code: string;
    label: string;
    priceFcfaMonthly: number;
    billingDays?: number;
    tagline?: string | null;
    maxScreens: number;
    videoQuality: string;
    hasAds: boolean;
    hasExclusiveAccess: boolean;
    features?: string[];
  };
  isActive?: boolean;
  recommended?: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Libellé du bouton quand disabled (ex. autre plan déjà actif) */
  disabledCtaLabel?: string;
  /** Style vitrine page /pricing */
  visual?: "default" | "pricing";
  /** Libellé du bouton en mode pricing */
  ctaContext?: "browse" | "settings";
}

const QUALITY_LABELS: Record<string, string> = { SD: "SD", HD: "HD", FHD: "Full HD" };

const PLAN_ICON: Record<string, typeof Crown> = {
  PREMIUM: Crown,
  PASS_24H: Zap,
  PASS_WEEK: Calendar,
};

function pricingCardClass(code: string, recommended: boolean): string {
  if (recommended || code === "PREMIUM") return "pricing-plan-card pricing-plan-card--premium";
  if (code === "PASS_24H") return "pricing-plan-card pricing-plan-card--pass24";
  if (code === "PASS_WEEK") return "pricing-plan-card pricing-plan-card--passweek";
  if (code === "FREE") return "pricing-plan-card pricing-plan-card--free";
  return "pricing-plan-card";
}

function pricingShellClass(code: string, recommended: boolean, disabled: boolean): string {
  const base = "pricing-plan-shell";
  if (recommended || code === "PREMIUM") return `${base} pricing-plan-shell--premium`;
  if (disabled) return `${base} pricing-plan-shell--disabled`;
  return base;
}

export function PlanCard({
  plan,
  isActive,
  recommended,
  onSelect,
  disabled,
  disabledCtaLabel = "Abonnement en cours",
  visual = "default",
  ctaContext = "browse",
}: PlanCardProps) {
  const isFree = plan.priceFcfaMonthly === 0;
  const period = planPeriodLabel(plan.billingDays ?? 30);
  const isPremium = plan.code === "PREMIUM" || recommended;
  const isPricing = visual === "pricing";
  const PlanIcon = PLAN_ICON[plan.code];

  const features = [
    plan.tagline,
    `${plan.maxScreens} écran${plan.maxScreens > 1 ? "s" : ""} simultané${plan.maxScreens > 1 ? "s" : ""}`,
    `Qualité ${QUALITY_LABELS[plan.videoQuality] ?? plan.videoQuality}`,
    plan.hasAds ? "Avec publicité" : "Sans publicité",
    plan.hasExclusiveAccess ? "Exclusivités incluses" : null,
    ...(plan.features ?? []),
  ].filter(Boolean) as string[];

  if (isPricing) {
    return (
      <div className={pricingShellClass(plan.code, !!recommended, !!disabled)}>
        <div className={pricingCardClass(plan.code, !!recommended)}>
          {recommended && (
            <span className={`pricing-plan-badge${recommended ? " pricing-plan-badge--pulse" : ""}`}>
              <Star size={11} className="fill-white shrink-0" />
              Le plus populaire
            </span>
          )}

          {isActive && (
            <span className="absolute top-4 right-4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-600/90 text-white">
              Actif
            </span>
          )}

          <div className="mb-5 pt-1">
            <div className="flex items-center gap-2.5 mb-3">
              {PlanIcon && (
                <span
                  className={`flex h-9 w-9 items-center justify-center border shrink-0 ${
                    isPremium
                      ? "border-brand-gold/40 bg-brand-purple/25 text-brand-gold"
                      : "border-white/15 bg-white/[0.04] text-brand-magenta"
                  }`}
                >
                  <PlanIcon size={17} strokeWidth={1.75} />
                </span>
              )}
              <h3 className="text-base font-semibold text-white tracking-tight">{plan.label}</h3>
            </div>
            <div>
              {isFree ? (
                <span className="pricing-plan-price text-white">Gratuit</span>
              ) : (
                <>
                  <span
                    className={`pricing-plan-price block ${
                      isPremium ? "pricing-plan-price--premium" : "text-white"
                    }`}
                  >
                    {formatXOF(plan.priceFcfaMonthly)}
                  </span>
                  <span className="text-xs text-white/45 mt-1 block tracking-wide uppercase">
                    / {period}
                  </span>
                </>
              )}
            </div>
          </div>

          <ul className="space-y-2.5 mb-6 flex-1">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13px]">
                <Check
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    isPremium ? "text-brand-gold" : "text-brand-magenta"
                  }`}
                />
                <span
                  className={
                    f.includes("publicité") && f.startsWith("Avec")
                      ? "text-white/40"
                      : "text-white/75"
                  }
                >
                  {f}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onSelect}
            disabled={disabled || isActive}
            className={`w-full py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
              isActive
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : isPremium
                  ? "ivod-btn ivod-btn-primary"
                  : isFree
                    ? "ivod-btn border border-white/12 bg-white/[0.06] text-white/90 hover:bg-white/[0.1]"
                    : "ivod-btn border border-white/15 bg-white/[0.08] text-white hover:border-brand-magenta/50 hover:bg-white/[0.12]"
            }`}
          >
            {isActive
              ? "Plan actuel"
              : disabled && !isActive
                ? disabledCtaLabel
                : isFree
                  ? "Compte gratuit"
                  : ctaContext === "settings"
                    ? "Payer"
                    : `Choisir · ${plan.label}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        recommended
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : isActive
            ? "border-green-500/50 bg-green-500/5"
            : "border-white/10 bg-surface hover:border-white/25"
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
            <Star size={10} className="fill-white" /> Recommandé
          </span>
        </div>
      )}

      {isActive && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">Actif</span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{plan.label}</h3>
        <div className="mt-2">
          {isFree ? (
            <span className="text-3xl font-bold text-white">Gratuit</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-white">{formatXOF(plan.priceFcfaMonthly)}</span>
              <span className="text-sm text-muted-foreground ml-1">/ {period}</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check size={14} className={recommended ? "text-primary" : "text-green-500"} />
            <span
              className={
                f.includes("publicité") && f.startsWith("Avec") ? "text-muted-foreground" : "text-white/80"
              }
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || isActive}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
          isActive
            ? "bg-green-600/20 text-green-400 border border-green-500/30"
            : recommended
              ? "bg-primary hover:bg-primary-hover text-white"
              : isFree
                ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                : "bg-white/10 hover:bg-white/20 border border-white/15 text-white"
        }`}
      >
        {isActive
          ? "Plan actuel"
          : disabled && !isActive
            ? disabledCtaLabel
            : isFree
              ? "Compte gratuit"
              : `Payer · ${plan.label}`}
      </button>
    </div>
  );
}
