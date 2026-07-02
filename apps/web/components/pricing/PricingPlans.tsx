"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { planCardReveal, staggerContainer, useReducedMotion } from "@/lib/motion/premium-motion";
import { Loader2, Tv, Sparkles, Shield, Smartphone } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import Link from "next/link";
import { PlanCard } from "@/components/payment/PlanCard";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { PAGE_X } from "@/components/public/PublicShell";
import { formatXOF } from "@/lib/utils/format";
import { PPV_PRICE_SUGGESTIONS } from "@/lib/constants/monetization";
import { PricingFaq } from "@/components/pricing/PricingFaq";

function planCtaHref(code: string, isAuthenticated: boolean) {
  if (code === "FREE") {
    return isAuthenticated ? "/" : "/auth/register";
  }
  if (isAuthenticated) {
    return `/settings/subscription?plan=${encodeURIComponent(code)}`;
  }
  return `/auth/register?plan=${encodeURIComponent(code)}`;
}

interface PricingPlansProps {
  variant?: "full" | "compact";
  /** Parent déjà en PAGE_MAX — pas de marge horizontale supplémentaire */
  constrained?: boolean;
  isAuthenticated?: boolean;
  activePlanCode?: string;
  showFree?: boolean;
  showTvod?: boolean;
  showFaq?: boolean;
  /** Entrée en cascade (accueil, page tarifs) */
  animateEntrance?: boolean;
  /** Paramètres : ouvre le paiement in-page au lieu de naviguer */
  onPlanSelect?: (plan: Record<string, unknown>) => void;
  /** Abonnement actif (sinon pas de badge « Plan actuel ») */
  hasActiveSubscription?: boolean;
}

export function PricingPlans({
  variant = "full",
  constrained = false,
  isAuthenticated = false,
  activePlanCode = "FREE",
  showFree = true,
  showTvod = true,
  showFaq = false,
  animateEntrance = true,
  onPlanSelect,
  hasActiveSubscription = false,
}: PricingPlansProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const isFull = variant === "full";
  const sectionX = constrained ? "w-full" : PAGE_X;

  const { data: allPlans, isLoading } = useQuery({
    queryKey: ["subscription-plans-all"],
    queryFn: subscriptionsApi.getAllPlans,
    staleTime: 60 * 60_000,
  });

  const freePlan = (allPlans ?? []).find((p: { code: string }) => p.code === "FREE");
  const paidPlans = (allPlans ?? [])
    .filter((p: { code: string }) => p.code !== "FREE");

  const displayPlans = isFull
    ? showFree && freePlan ? [freePlan, ...paidPlans] : paidPlans
    : paidPlans;

  const paidSubscriptionActive =
    isAuthenticated && hasActiveSubscription && activePlanCode !== "FREE";

  const gridClass = isFull
    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6 lg:gap-7 items-stretch"
    : "grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 items-stretch";

  return (
    <div className={isFull ? "space-y-16 md:space-y-20" : "space-y-6"}>
      {isLoading ? (
        <BrandLoader
          fullScreen={false}
          size="md"
          tagline="Offres d'abonnement"
          className="py-12"
        />
      ) : (
        <motion.div
          className={gridClass}
          variants={animateEntrance ? staggerContainer(reduced) : undefined}
          initial={animateEntrance ? "hidden" : undefined}
          whileInView={animateEntrance ? "show" : undefined}
          viewport={animateEntrance ? { once: true, margin: "-48px" } : undefined}
        >
          {displayPlans.map((plan: any, index: number) => (
            <motion.div
              key={plan.code}
              variants={
                animateEntrance
                  ? planCardReveal(reduced, index, plan.code === "PREMIUM")
                  : undefined
              }
              className="h-full"
            >
              <PlanCard
                plan={plan}
                visual="pricing"
                recommended={plan.code === "PREMIUM"}
                isActive={paidSubscriptionActive && activePlanCode === plan.code}
                disabled={
                  paidSubscriptionActive &&
                  plan.code !== "FREE" &&
                  plan.code !== activePlanCode
                }
                disabledCtaLabel="Abonnement en cours"
                ctaContext={onPlanSelect ? "settings" : "browse"}
                onSelect={() =>
                  onPlanSelect
                    ? onPlanSelect(plan)
                    : router.push(planCtaHref(plan.code, isAuthenticated))
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {variant === "compact" && (
        <p className={`${sectionX} text-center`}>
          <Link
            href="/pricing"
            className="text-sm ivod-gradient-text font-semibold hover:opacity-90 transition-opacity"
          >
            Comparer toutes les offres →
          </Link>
        </p>
      )}

      {showTvod && isFull && (
        <section className={sectionX}>
          <div className="pricing-tvod-panel p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-brand-magenta/35 bg-brand-purple/20">
              <Tv size={24} className="text-brand-magenta" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-orange mb-2">
                TVOD · À l&apos;unité
              </p>
              <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
                Un film, un prix — sans abonnement
              </h3>
              <p className="text-sm text-white/55 leading-relaxed max-w-xl">
                Certains titres sont disponibles en achat unique via Paystack. Payez une fois,
                regardez autant de fois que vous voulez.
              </p>
              <p className="text-xs text-white/40 mt-3 font-medium">
                {PPV_PRICE_SUGGESTIONS.map((p) => formatXOF(p)).join(" · ")}
              </p>
            </div>
            <Link
              href="/films"
              className="shrink-0 ivod-btn ivod-btn-primary inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold"
            >
              Explorer le catalogue
            </Link>
          </div>
        </section>
      )}

      {isFull && (
        <section className={sectionX}>
          <div className="pricing-trust-strip flex flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6 py-5">
            <span className="inline-flex items-center gap-2 text-xs text-white/55">
              <Shield size={15} className="text-brand-magenta shrink-0" />
              Paiement sécurisé Paystack
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/55">
              <Smartphone size={15} className="text-brand-orange shrink-0" />
              Mobile Money via Paystack
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/55">
              <Sparkles size={15} className="text-brand-gold shrink-0" />
              Montants en FCFA · UEMOA
            </span>
          </div>
        </section>
      )}

      {showFaq && isFull && (
        <section className={sectionX}>
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text mb-2">
              FAQ
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              Questions fréquentes
            </h2>
            <div className="mx-auto ivod-line-accent w-10 mt-4" />
          </div>
          <PricingFaq />
        </section>
      )}
    </div>
  );
}
