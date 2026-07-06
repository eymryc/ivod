import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, FileText, CheckCircle2, XCircle } from "lucide-react-native";
import { subscriptionsApi, paymentsApi, homeApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/SettingsShell";
import { ListCard } from "@/components/layout/ListCard";
import { PlanCard } from "@/components/pricing/PlanCard";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { usePaymentCheckout } from "@/presentation/hooks/use-payment-checkout";
import { pollPaymentStatus } from "@/presentation/utils/poll-payment";
import { buildPaystackCallbackBase } from "@/core/config/payment";
import { navigateExpoPath } from "@/presentation/utils/expo-router-path";
import { toast } from "@/presentation/utils/toast";
import { formatXOF } from "@/core/pricing/format";
import type { SubscriptionPlan } from "@/core/pricing/types";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Step = "plans" | "payment" | "pending" | "success" | "error";

type SubscribeResponse = {
  alreadyActive?: boolean;
  alreadyCompleted?: boolean;
  simulationMode?: boolean;
  payment?: { id?: string; redirectUrl?: string; reference?: string };
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { openCheckout } = usePaymentCheckout();
  const { plan: planParam, paid: paidParam } = useLocalSearchParams<{
    plan?: string;
    paid?: string;
  }>();
  const paidFromUrl = paidParam === "1";

  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const pollCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pollCleanup.current?.();
    };
  }, []);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionsApi.getPlans(),
    staleTime: 60 * 60_000,
  });

  const { data: active } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: () => subscriptionsApi.getActive(),
    staleTime: 5 * 60_000,
  });

  const { data: subHistory = [] } = useQuery({
    queryKey: ["subscription-history"],
    queryFn: () => subscriptionsApi.getHistory(),
    staleTime: 5 * 60_000,
  });

  const { data: invoicesRaw } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => paymentsApi.getInvoices(1),
    staleTime: 5 * 60_000,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => paymentsApi.list(1, 10),
    staleTime: 60_000,
  });

  const { data: homeConfig } = useQuery({
    queryKey: ["home-config"],
    queryFn: () => homeApi.getConfig(),
    staleTime: 60 * 60_000,
  });

  const paidPlanOrder: string[] =
    (homeConfig as { paidPlanOrder?: string[] } | undefined)?.paidPlanOrder ??
    ["PASS_24H", "PASS_WEEK", "PREMIUM"];

  const paidPlans = (
    (Array.isArray(plans) ? plans : []) as unknown as SubscriptionPlan[]
  )
    .filter((p) => p.code !== "FREE")
    .sort((a, b) => paidPlanOrder.indexOf(a.code) - paidPlanOrder.indexOf(b.code));

  const sub = active as {
    id?: string;
    hasActiveSubscription?: boolean;
    plan?: string;
    planDetails?: { label?: string; code?: string };
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  } | undefined;

  const activeCode = sub?.planDetails?.code ?? sub?.plan ?? "FREE";
  const paidActive = !!sub?.hasActiveSubscription && activeCode !== "FREE";

  useEffect(() => {
    if (!paidFromUrl) return;
    setStep("success");
    qc.invalidateQueries({ queryKey: ["subscription-me"] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    navigateExpoPath(router, "/settings/subscription", "replace");
  }, [paidFromUrl, qc, router]);

  useEffect(() => {
    if (paidFromUrl || !planParam || !paidPlans.length || selectedPlan) return;
    if (paidActive && activeCode === planParam) {
      router.replace("/settings/subscription");
      return;
    }
    if (paidActive && activeCode !== "FREE" && planParam !== activeCode) {
      router.replace("/settings/subscription");
      return;
    }
    const match = paidPlans.find((p) => p.code === planParam);
    if (match) {
      setSelectedPlan(match);
      setStep("payment");
    }
  }, [paidFromUrl, planParam, paidPlans, selectedPlan, paidActive, activeCode, router]);

  const startPoll = (paymentId: string) => {
    pollCleanup.current?.();
    pollCleanup.current = pollPaymentStatus({
      paymentId,
      onCompleted: () => {
        setStep("success");
        qc.invalidateQueries({ queryKey: ["subscription-me"] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
      },
      onFailed: () => setStep("error"),
    });
  };

  const subscribe = useMutation({
    mutationFn: async (data: { email: string }) => {
      if (!selectedPlan) throw new Error("Aucun plan sélectionné");
      return subscriptionsApi.subscribe({
        planCode: selectedPlan.code,
        providerCode: "PAYSTACK",
        email: data.email,
        callbackUrl: buildPaystackCallbackBase(),
      }) as Promise<SubscribeResponse>;
    },
    onSuccess: async (data) => {
      if (data.alreadyActive || data.alreadyCompleted) {
        setStep("success");
        qc.invalidateQueries({ queryKey: ["subscription-me"] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
        return;
      }

      if (data.simulationMode) {
        toast.warning(
          "Mode simulation : aucun débit réel. Configurez Paystack pour un vrai paiement.",
        );
      }

      const paymentId = data.payment?.id ?? data.payment?.reference;
      const redirectUrl = data.payment?.redirectUrl;

      if (!paymentId) {
        setStep("error");
        return;
      }

      if (redirectUrl) {
        await openCheckout({
          paymentId,
          redirectUrl,
          simulationMode: data.simulationMode,
        });
        return;
      }

      setStep("pending");
      startPoll(paymentId);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setStep("error");
    },
  });

  const cancel = useMutation({
    mutationFn: (subscriptionId: string) => subscriptionsApi.cancel(subscriptionId),
    onSuccess: () => {
      toast.success("Annulation programmée en fin de période.");
      qc.invalidateQueries({ queryKey: ["subscription-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handlePlanSelect(plan: SubscriptionPlan) {
    if (plan.code === "FREE") return;
    const isCurrent = paidActive && activeCode === plan.code;
    if (isCurrent) return;

    if (paidActive && activeCode !== "FREE" && plan.code !== activeCode) {
      toast.info(
        "Vous avez déjà un abonnement actif. Annulez-le à la fin de la période pour changer de formule.",
      );
      return;
    }

    setSelectedPlan(plan);
    setStep("payment");
  }

  const historyList = (Array.isArray(subHistory) ? subHistory : []) as Array<{
    id: string;
    plan?: { label?: string };
    status?: { label?: string; code?: string };
    currentPeriodEnd?: string;
    payments?: Array<{ amount?: number }>;
  }>;

  const invoiceList = (
    Array.isArray(invoicesRaw)
      ? invoicesRaw
      : ((invoicesRaw as { items?: unknown[] })?.items ?? [])
  ) as Array<{ id: string; number?: string; amount?: number; createdAt?: string }>;

  const paymentItems = paymentHistory?.items ?? [];

  if (step === "payment" && selectedPlan) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <PaymentForm
          planLabel={selectedPlan.label}
          amountFcfa={selectedPlan.priceFcfaMonthly}
          onSubmit={(data) => subscribe.mutate({ email: data.email })}
          onCancel={() => {
            setSelectedPlan(null);
            setStep("plans");
          }}
          isLoading={subscribe.isPending}
        />
      </ScrollView>
    );
  }

  if (step === "pending") {
    return (
      <View style={styles.centered}>
        <PremiumPanel style={styles.statePanel}>
          <ActivityIndicator size="large" color={colors.magenta} />
          <Text style={styles.stateTitle}>Paiement en cours…</Text>
          <Text style={styles.stateMessage}>
            Finalisez le paiement dans le navigateur si besoin. Cette page se met à jour
            automatiquement.
          </Text>
        </PremiumPanel>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={styles.centered}>
        <PremiumPanel style={styles.statePanel}>
          <CheckCircle2 color={colors.success} size={48} />
          <Text style={styles.stateTitle}>Abonnement activé</Text>
          <Text style={styles.stateMessage}>Profitez de tout le catalogue iVOD.</Text>
          <TouchableOpacity style={styles.stateBtn} onPress={() => setStep("plans")}>
            <Text style={styles.stateBtnText}>Retour à mes abonnements</Text>
          </TouchableOpacity>
        </PremiumPanel>
      </View>
    );
  }

  if (step === "error") {
    return (
      <View style={styles.centered}>
        <PremiumPanel style={styles.statePanel}>
          <XCircle color={colors.error} size={48} />
          <Text style={styles.stateTitle}>Paiement échoué</Text>
          <Text style={styles.stateMessage}>
            Veuillez réessayer ou contacter le support.
          </Text>
          <TouchableOpacity style={styles.stateBtn} onPress={() => setStep("plans")}>
            <Text style={styles.stateBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </PremiumPanel>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <SettingsPanel>
        <SettingsSectionHeader
          icon={CreditCard}
          title="Passes & abonnement"
          description="Carte & Mobile Money · Pass 24h, semaine ou Premium."
        />

        {sub?.hasActiveSubscription && activeCode !== "FREE" ? (
          <View style={styles.activeBox}>
            <Text style={styles.activeTitle}>Plan actuel</Text>
            <Text style={styles.activePlan}>
              {sub.planDetails?.label ?? sub.planDetails?.code}
            </Text>
            {sub.currentPeriodEnd ? (
              <Text style={styles.activeEnd}>
                Renouvellement le{" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
              </Text>
            ) : null}
            {sub.cancelAtPeriodEnd ? (
              <Text style={styles.cancelNote}>Fin prochaine</Text>
            ) : sub.id ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  Alert.alert(
                    "Annuler l'abonnement",
                    "Votre accès reste actif jusqu'à la fin de la période payée.",
                    [
                      { text: "Non", style: "cancel" },
                      {
                        text: "Confirmer",
                        style: "destructive",
                        onPress: () => cancel.mutate(sub.id!),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.cancelBtnText}>Annuler le renouvellement</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Text style={styles.intro}>
            Choisissez un pass ou Premium pour accéder au catalogue sans publicité.
          </Text>
        )}

        {plansLoading ? (
          <Text style={styles.intro}>Chargement des offres…</Text>
        ) : (
          paidPlans.map((p) => {
            const isCurrent = paidActive && activeCode === p.code;
            const highlight = planParam === p.code && !isCurrent;
            return (
              <View key={p.code} style={highlight ? styles.highlight : undefined}>
                <PlanCard
                  embedded
                  plan={p}
                  visual="pricing"
                  recommended={p.code === "PREMIUM"}
                  isActive={isCurrent}
                  disabled={isCurrent || subscribe.isPending}
                  disabledCtaLabel={isCurrent ? "Plan actuel" : undefined}
                  ctaContext="settings"
                  onSelect={() => handlePlanSelect(p)}
                />
              </View>
            );
          })
        )}
      </SettingsPanel>

      {paymentItems.length > 0 ? (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={CreditCard}
            title="Historique des paiements"
            description="Transactions Paystack récentes."
          />
          {paymentItems.map((p) => (
            <ListCard
              key={p.id}
              title="Paiement iVOD"
              body={new Date(p.createdAt).toLocaleDateString("fr-FR")}
              meta={formatXOF(p.amount)}
            />
          ))}
        </SettingsPanel>
      ) : null}

      {invoiceList.length > 0 ? (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={FileText}
            title="Factures"
            description="Vos dernières factures Paystack."
          />
          {invoiceList.slice(0, 8).map((inv) => (
            <ListCard
              key={inv.id}
              title={inv.number ?? `Facture ${inv.id.slice(0, 8)}`}
              body={
                inv.createdAt
                  ? new Date(inv.createdAt).toLocaleDateString("fr-FR")
                  : undefined
              }
              meta={inv.amount != null ? formatXOF(inv.amount) : undefined}
            />
          ))}
        </SettingsPanel>
      ) : null}

      {historyList.length > 0 ? (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={CreditCard}
            title="Historique des abonnements"
            description="Vos abonnements passés."
          />
          {historyList.slice(0, 6).map((h) => (
            <ListCard
              key={h.id}
              title={h.plan?.label ?? "Abonnement"}
              body={
                h.currentPeriodEnd
                  ? `Jusqu'au ${new Date(h.currentPeriodEnd).toLocaleDateString("fr-FR")}`
                  : undefined
              }
              meta={
                typeof h.status === "object"
                  ? h.status?.label ?? h.status?.code
                  : String(h.status ?? "")
              }
            />
          ))}
        </SettingsPanel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  centered: { flex: 1, justifyContent: "center", padding: 20 },
  statePanel: { alignItems: "center", gap: 12, padding: 28 },
  stateTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  stateMessage: { ...typography.bodyMuted, textAlign: "center", lineHeight: 22 },
  stateBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.magenta,
  },
  stateBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  intro: { ...typography.bodyMuted, marginBottom: 8 },
  highlight: {
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.45)",
    marginBottom: 4,
  },
  activeBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.35)",
    backgroundColor: "rgba(52,211,153,0.08)",
    gap: 4,
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },
  activePlan: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  activeEnd: { fontSize: 13, color: colors.muted },
  cancelNote: { fontSize: 12, color: colors.warning, marginTop: 4 },
  cancelBtn: { marginTop: 10, alignSelf: "flex-start" },
  cancelBtnText: { fontSize: 13, color: colors.error, fontWeight: "600" },
});
