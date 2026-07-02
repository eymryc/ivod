"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { PublicPageHeader, PAGE_MAX } from "@/components/public/PublicShell";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { useAuthStore } from "@/lib/stores/auth.store";

const COMPARE_ROWS = [
  { label: "Publicité", free: "Oui", paid: "Non" },
  { label: "Qualité max.", free: "SD", paid: "HD / Full HD" },
  { label: "Écrans simultanés", free: "1", paid: "Jusqu'à 4" },
  { label: "Téléchargements", free: "—", paid: "Selon le plan" },
  { label: "Exclusivités", free: "—", paid: "Premium" },
] as const;

export function PricingPageClient() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const planCode = (currentSub as { plan?: string })?.plan ?? "FREE";
  const hasPaidPlan =
    isAuthenticated &&
    planCode !== "FREE" &&
    (currentSub as { hasActiveSubscription?: boolean })?.hasActiveSubscription;

  return (
    <div className="relative min-h-screen page-canvas pb-16 md:pb-24 overflow-hidden">
      <div className="pricing-ambient" aria-hidden>
        <div className="pricing-ambient__orb pricing-ambient__orb--magenta" />
        <div className="pricing-ambient__orb pricing-ambient__orb--purple" />
        <div className="pricing-ambient__orb pricing-ambient__orb--gold" />
      </div>

      <div className={`relative ${PAGE_MAX} pt-8 md:pt-12`}>
        <PublicPageHeader
          kicker="Offres iVOD"
          title={
            <>
              Choisissez votre{" "}
              <span className="ivod-gradient-text">expérience</span>
            </>
          }
          subtitle={
            <>
              Gratuit avec pub, micro-paiement 24h ou 7 jours, ou{" "}
              <strong className="text-white/85 font-medium">Premium</strong> mensuel — tout en
              FCFA, paiement{" "}
              <strong className="text-white/85 font-medium">Paystack</strong> (Mobile Money & carte).
            </>
          }
          action={
            !isAuthenticated ? (
              <Link
                href="/auth/register"
                className="ivod-btn ivod-btn-primary inline-flex h-11 items-center px-6 text-sm font-semibold shrink-0"
              >
                Commencer gratuitement
              </Link>
            ) : hasPaidPlan ? (
              <Link
                href="/settings/subscription"
                className="ivod-btn inline-flex h-11 items-center px-5 border border-white/15 text-sm text-white/80 hover:text-white hover:border-brand-magenta/40 shrink-0"
              >
                Gérer mon abonnement
              </Link>
            ) : (
              <Link
                href="/settings/subscription?plan=PREMIUM"
                className="ivod-btn ivod-btn-primary inline-flex h-11 items-center gap-2 px-6 text-sm font-semibold shrink-0"
              >
                <Crown size={16} />
                Passer Premium
              </Link>
            )
          }
        />

        <div className="flex flex-wrap gap-3 mb-10 md:mb-12">
          {[
            { label: "Pass 24h", value: "150 FCFA" },
            { label: "Pass semaine", value: "500 FCFA" },
            { label: "Premium", value: "1 500 FCFA/mois", highlight: true },
          ].map((chip) => (
            <div
              key={chip.label}
              className={`px-4 py-2.5 border text-left ${
                chip.highlight
                  ? "border-brand-magenta/40 bg-brand-purple/15"
                  : "border-white/[0.08] bg-white/[0.03]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-white/45 mb-0.5">{chip.label}</p>
              <p
                className={`text-sm font-semibold ${
                  chip.highlight ? "ivod-gradient-text" : "text-white"
                }`}
              >
                {chip.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-2 md:mt-4">
          <PricingPlans
            variant="full"
            constrained
            isAuthenticated={isAuthenticated}
            activePlanCode={planCode}
            hasActiveSubscription={!!hasPaidPlan}
            showFree
            showTvod
            showFaq
          />
        </div>

        <section className="mt-16 md:mt-24">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text mb-2">
              Comparatif
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              Gratuit vs abonnés
            </h2>
            <div className="mx-auto ivod-line-accent w-10 mt-4" />
          </div>
          <div className="pricing-compare-wrap overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-5 text-white/45 font-medium"> </th>
                  <th className="py-4 px-5 text-white/60 font-medium text-center">Gratuit</th>
                  <th className="py-4 px-5 text-center">
                    <span className="ivod-gradient-text font-semibold">Passes & Premium</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-3.5 px-5 text-white/50">{row.label}</td>
                    <td className="py-3.5 px-5 text-white/65 text-center">{row.free}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="inline-flex items-center justify-center gap-1.5 text-white">
                        <Check size={14} className="text-brand-gold shrink-0" />
                        {row.paid}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 md:mt-20 text-center">
          <div className="border border-white/[0.08] bg-white/[0.02] px-8 py-10 md:py-12">
            <Crown size={28} className="mx-auto text-brand-gold mb-4" strokeWidth={1.25} />
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text mb-2">
              Prêt à regarder ?
            </p>
            <h3 className="text-xl font-semibold text-white mb-6">
              Le meilleur du cinéma africain vous attend
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/films"
                className="ivod-btn ivod-btn-primary h-11 px-6 text-sm font-semibold inline-flex items-center"
              >
                Explorer les films
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/auth/login"
                  className="ivod-btn h-11 px-5 border border-white/15 text-sm text-white/80 inline-flex items-center hover:border-brand-magenta/40"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
