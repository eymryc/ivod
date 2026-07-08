"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FileText, Download, CreditCard } from "lucide-react";
import { BrandLoader, BrandLoaderMark } from "@/components/ui/BrandLoader";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsList,
  SettingsListRow,
  SettingsBadge,
} from "@/components/settings/SettingsUI";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { paymentsApi } from "@/lib/api/payments";
import { formatXOF, formatRelative } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import {
  isPaymentCompleted,
  isPaymentFailed,
  paymentStatusCode,
} from "@/lib/utils/payment-status";

type Step = "plans" | "payment" | "pending" | "success" | "error";

function planLabel(plan: unknown): string {
  if (plan == null) return "—";
  if (typeof plan === "string") return plan;
  if (typeof plan === "object") {
    const p = plan as { label?: string; code?: string };
    return p.label ?? p.code ?? "—";
  }
  return String(plan);
}

function statusLabel(status: unknown): string {
  if (status == null) return "—";
  if (typeof status === "string") return status;
  if (typeof status === "object") {
    const s = status as { label?: string; code?: string };
    return s.label ?? s.code ?? "—";
  }
  return String(status);
}

function SubscriptionPageContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");
  const paidFromUrl = searchParams.get("paid") === "1";
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionsApi.getPlans,
    staleTime: 60 * 60_000,
  });

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    staleTime: 5 * 60_000,
  });

  const { data: subHistory } = useQuery({
    queryKey: ["subscription-history"],
    queryFn: subscriptionsApi.getHistory,
    staleTime: 5 * 60_000,
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => paymentsApi.getInvoices(),
    staleTime: 5 * 60_000,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => paymentsApi.list(1, 10),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!paidFromUrl) return;
    setStep("success");
    qc.invalidateQueries({ queryKey: ["subscription-me"] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    router.replace("/settings/subscription");
  }, [paidFromUrl, qc, router]);

  useEffect(() => {
    if (paidFromUrl || !planFromUrl || !plans?.length || selectedPlan) return;
    const activeCode =
      typeof currentSub?.plan === "object"
        ? (currentSub.plan as { code?: string }).code
        : typeof currentSub?.plan === "string"
          ? currentSub.plan
          : undefined;
    if (activeCode === planFromUrl) {
      router.replace("/settings/subscription");
      return;
    }
    if (currentSub?.hasActiveSubscription && activeCode && activeCode !== "FREE") {
      router.replace("/settings/subscription");
      return;
    }
    const match = (plans as any[]).find((p) => p.code === planFromUrl);
    if (match) {
      setSelectedPlan(match);
      setStep("payment");
    }
  }, [paidFromUrl, planFromUrl, plans, selectedPlan, currentSub, router]);

  const subscribeMutation = useMutation({
    mutationFn: (data: { providerCode: string; email: string; phoneNumber?: string }) =>
      subscriptionsApi.subscribe({
        planCode: selectedPlan.code,
        providerCode: "PAYSTACK",
        email: data.email,
        phoneNumber: data.phoneNumber,
      }),
    onSuccess: (data) => {
      if (data.alreadyActive || data.alreadyCompleted) {
        setStep("success");
        qc.invalidateQueries({ queryKey: ["subscription-me"] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
        return;
      }
      if (data.simulationMode) {
        toast.info("Mode démo : aucun débit réel.");
      }
      const paymentId = data.payment?.id ?? data.payment?.reference;
      const redirectUrl = data.payment?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      if (paymentId) {
        setStep("pending");
        pollPayment(paymentId);
      } else {
        setStep("error");
      }
    },
    onError: (err: ApiError) => {
      showApiError(err);
      setStep("error");
    },
  });

  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancel(id, { cancelAtPeriodEnd: true }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["subscription-me"] });
      setConfirmCancel(false);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.generateInvoice(paymentId),
    onSuccess: (data) => { showApiSuccess(data); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (err: ApiError) => showApiError(err),
  });

  const pollPayment = (pid?: string) => {
    if (!pid) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        if (attempts === 1) {
          try {
            await paymentsApi.syncPayment(pid);
          } catch {
            /* webhook peut avoir déjà finalisé */
          }
        }
        const payment = await paymentsApi.getOne(pid);
        if (isPaymentCompleted(payment.status)) {
          clearInterval(interval);
          setStep("success");
          qc.invalidateQueries({ queryKey: ["subscription-me"] });
          qc.invalidateQueries({ queryKey: ["invoices"] });
        } else if (isPaymentFailed(payment.status) || attempts > 24) {
          clearInterval(interval);
          setStep("error");
        }
      } catch { if (attempts > 24) { clearInterval(interval); setStep("error"); } }
    }, 5000);
  };

  if (step === "payment" && selectedPlan) {
    return (
      <div className="w-full max-w-md mx-auto">
        <PaymentForm
          planLabel={selectedPlan.label}
          amountFcfa={selectedPlan.priceFcfaMonthly}
          onSubmit={(data) => subscribeMutation.mutate(data)}
          onCancel={() => setStep("plans")}
          isLoading={subscribeMutation.isPending}
        />
      </div>
    );
  }

  if (step === "pending") {
    return (
      <div className="payment-form-panel w-full max-w-md mx-auto py-10 px-6 text-center">
        <BrandLoaderMark size="md" showTagline={false} tagline="En attente" />
        <p className="text-caption font-semibold text-brand-magenta mb-2 mt-6">
          En attente
        </p>
        <h2 className="text-xl font-semibold text-white mb-3">Paiement en cours…</h2>
        <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
          Finalisez le paiement dans la fenêtre sécurisée si elle s&apos;est ouverte. Cette page se
          met à jour automatiquement.
        </p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="payment-form-panel w-full max-w-md mx-auto py-10 px-6 text-center">
        <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-5" />
        <h2 className="text-xl font-semibold text-white mb-2">Abonnement activé</h2>
        <p className="text-sm text-white/50 mb-6">Profitez de tout le catalogue iVOD.</p>
        <button
          type="button"
          onClick={() => setStep("plans")}
          className="ivod-btn ivod-btn-primary h-11 px-6 text-sm font-semibold"
        >
          Retour à mes abonnements
        </button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="payment-form-panel w-full max-w-md mx-auto py-10 px-6 text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-5" />
        <h2 className="text-xl font-semibold text-white mb-2">Paiement échoué</h2>
        <p className="text-sm text-white/50 mb-6">Veuillez réessayer ou contacter le support.</p>
        <button
          type="button"
          onClick={() => setStep("plans")}
          className="ivod-btn h-11 px-6 border border-white/15 text-sm font-medium text-white/80 hover:text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const invoiceList: any[] = (invoices as any)?.items ?? invoices ?? [];
  const historyList: any[] = (subHistory as any)?.items ?? subHistory ?? [];
  const activePlanCode =
    (currentSub as { planDetails?: { code?: string }; plan?: string })?.planDetails?.code ??
    (currentSub as { plan?: string })?.plan ??
    "FREE";

  return (
    <div className="space-y-6 md:space-y-8">
      {currentSub?.hasActiveSubscription && (
        <SettingsPanel>
          <div className="flex flex-wrap items-start gap-4">
            <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white">
                Plan actuel :{" "}
                <span className="text-brand-magenta">
                  {currentSub.planDetails?.label ?? planLabel(currentSub.plan)}
                </span>
              </p>
              {currentSub.currentPeriodEnd && (
                <p className="text-sm text-white/45 mt-1">
                  Renouvellement le{" "}
                  {new Date(currentSub.currentPeriodEnd).toLocaleDateString("fr-CI")}
                </p>
              )}
            </div>
            {currentSub.id && !currentSub.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelMutation.isPending}
                className="ivod-btn flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                {cancelMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <AlertTriangle size={12} />
                )}
                Annuler
              </button>
            )}
            {currentSub.cancelAtPeriodEnd && (
              <SettingsBadge variant="warning">Fin prochaine</SettingsBadge>
            )}
          </div>

          <ConfirmDeleteModal
            open={confirmCancel}
            title="Annuler l'abonnement"
            message="Annuler votre abonnement à la fin de la période ?"
            description="Vous garderez l'accès jusqu'à la fin de la période déjà payée."
            confirmLabel="Annuler l'abonnement"
            pending={cancelMutation.isPending}
            onClose={() => setConfirmCancel(false)}
            onConfirm={() => currentSub.id && cancelMutation.mutate(currentSub.id)}
          />
        </SettingsPanel>
      )}

      <SettingsPanel>
        <SettingsSectionHeader
          icon={CreditCard}
          title="Passes & abonnement"
          description="Carte & Mobile Money · Pass 24h, semaine ou Premium mensuel."
          action={
            <a
              href="/pricing"
              className="text-sm text-brand-magenta hover:underline shrink-0"
            >
              Voir la grille tarifaire
            </a>
          }
        />
        <div className="pt-2">
          <PricingPlans
            variant="compact"
            constrained
            isAuthenticated={isAuthenticated}
            activePlanCode={activePlanCode}
            hasActiveSubscription={!!currentSub?.hasActiveSubscription}
            showFree={false}
            showTvod={false}
            showFaq={false}
            animateEntrance={false}
            onPlanSelect={(plan) => {
              if (
                currentSub?.hasActiveSubscription &&
                activePlanCode !== "FREE" &&
                plan.code !== activePlanCode
              ) {
                toast.info(
                  "Vous avez déjà un abonnement actif. Annulez-le à la fin de la période pour changer de formule.",
                );
                return;
              }
              setSelectedPlan(plan);
              setStep("payment");
            }}
          />
        </div>
      </SettingsPanel>

      {historyList.length > 0 && (
        <SettingsPanel>
          <SettingsSectionHeader title="Historique des abonnements" />
          <SettingsList>
            {historyList.map((s: any) => (
              <SettingsListRow key={s.id}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white">{planLabel(s.plan ?? s.planCode)}</span>
                  {(s.currentPeriodStart ?? s.startedAt) && (
                    <span className="text-xs text-white/40 ml-2">
                      depuis {formatRelative(s.currentPeriodStart ?? s.startedAt)}
                    </span>
                  )}
                </div>
                <SettingsBadge
                  variant={statusLabel(s.status) === "ACTIVE" ? "success" : "default"}
                >
                  {statusLabel(s.status)}
                </SettingsBadge>
                {(s.payments?.[0]?.amount ?? s.amount) != null && (
                  <span className="text-xs text-white/45 tabular-nums">
                    {formatXOF(s.payments?.[0]?.amount ?? s.amount)}
                  </span>
                )}
              </SettingsListRow>
            ))}
          </SettingsList>
        </SettingsPanel>
      )}

      {Array.isArray((paymentHistory as any)?.items) && (paymentHistory as any).items.length > 0 && (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={CreditCard}
            title="Historique des paiements"
            description="Transactions (abonnements et achats)."
          />
          <SettingsList>
            {((paymentHistory as { items?: any[] })?.items ?? []).map((p: any) => (
              <SettingsListRow key={p.id}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white">
                    {p.userSubscription?.plan?.label ??
                      p.content?.title ??
                      "Paiement iVOD"}
                  </span>
                  <span className="text-xs text-white/40 ml-2">
                    {formatRelative(p.createdAt)}
                  </span>
                </div>
                <SettingsBadge
                  variant={
                    paymentStatusCode(p.status) === "COMPLETED" ? "success" : "default"
                  }
                >
                  {typeof p.status === "object" ? p.status?.label : p.status}
                </SettingsBadge>
                <span className="text-xs text-white/45 tabular-nums">
                  {formatXOF(Number(p.amount))}
                </span>
              </SettingsListRow>
            ))}
          </SettingsList>
        </SettingsPanel>
      )}

      {invoiceList.length > 0 && (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={FileText}
            title="Factures"
            description="Téléchargez ou générez vos factures au format PDF."
          />
          <SettingsList>
            {invoiceList.map((inv: any) => (
              <SettingsListRow key={inv.id}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {inv.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString("fr-CI", {
                          month: "long",
                          year: "numeric",
                        })
                      : "Facture"}
                  </p>
                  {inv.amount && <p className="text-xs text-white/45 mt-0.5">{formatXOF(inv.amount)}</p>}
                </div>
                <SettingsBadge
                  variant={statusLabel(inv.status) === "PAID" ? "success" : "default"}
                >
                  {statusLabel(inv.status)}
                </SettingsBadge>
                {inv.paymentId && !inv.pdfUrl && (
                  <button
                    type="button"
                    onClick={() => generateInvoiceMutation.mutate(inv.paymentId)}
                    disabled={generateInvoiceMutation.isPending}
                    className="ivod-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-brand-magenta/30 text-brand-magenta hover:bg-brand-magenta/10 transition-colors"
                  >
                    {generateInvoiceMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <FileText size={12} />
                    )}
                    Générer
                  </button>
                )}
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ivod-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/15 text-white/75 hover:text-white transition-colors"
                  >
                    <Download size={12} /> PDF
                  </a>
                )}
              </SettingsListRow>
            ))}
          </SettingsList>
        </SettingsPanel>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <BrandLoader
          fullScreen={false}
          size="md"
          tagline="Abonnement"
          className="min-h-[40vh]"
        />
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
