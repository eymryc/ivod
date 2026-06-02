import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { CreditCard, FileText } from "lucide-react-native";
import { subscriptionsApi, paymentsApi, homeApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/SettingsShell";
import { ListCard } from "@/components/layout/ListCard";
import { PlanCard } from "@/components/pricing/PlanCard";
import type { SubscriptionPlan } from "@/core/pricing/types";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function SubscriptionScreen() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { plan: planParam } = useLocalSearchParams<{ plan?: string }>();

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

  const { data: homeConfig } = useQuery({
    queryKey: ["home-config"],
    queryFn: () => homeApi.getConfig(),
    staleTime: 60 * 60_000,
  });
  const paidPlanOrder: string[] =
    (homeConfig as { paidPlanOrder?: string[] } | undefined)?.paidPlanOrder ??
    ["PASS_24H", "PASS_WEEK", "PREMIUM"];
  const paidPlans = (Array.isArray(plans) ? (plans as SubscriptionPlan[]) : [])
    .filter((p) => p.code !== "FREE")
    .sort((a, b) => paidPlanOrder.indexOf(a.code) - paidPlanOrder.indexOf(b.code));

  const subscribe = useMutation({
    mutationFn: async (planCode: string) => {
      const res = await subscriptionsApi.subscribe({
        planCode,
        providerCode: "PAYSTACK",
        email: user?.email ?? "",
      });
      const redirect = (res as { payment?: { redirectUrl?: string } })?.payment?.redirectUrl;
      if (redirect) {
        await WebBrowser.openBrowserAsync(redirect);
        const paymentId = (res as { payment?: { id?: string } })?.payment?.id;
        if (paymentId) {
          try {
            await paymentsApi.syncPayment(paymentId);
          } catch {
            /* webhook */
          }
        }
        qc.invalidateQueries({ queryKey: ["subscription-me"] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
      }
      return res;
    },
    onError: (e: Error) => Alert.alert("Paiement", e.message),
  });

  const cancel = useMutation({
    mutationFn: (subscriptionId: string) => subscriptionsApi.cancel(subscriptionId),
    onSuccess: () => {
      Alert.alert("Abonnement", "Annulation programmée en fin de période.");
      qc.invalidateQueries({ queryKey: ["subscription-me"] });
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

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

  const historyList = (Array.isArray(subHistory) ? subHistory : []) as Array<{
    id: string;
    plan?: { label?: string };
    status?: { label?: string; code?: string };
    currentPeriodEnd?: string;
  }>;

  const invoiceList = (
    Array.isArray(invoicesRaw)
      ? invoicesRaw
      : ((invoicesRaw as { items?: unknown[] })?.items ?? [])
  ) as Array<{ id: string; number?: string; amount?: number; createdAt?: string }>;

  function handlePlanSelect(plan: SubscriptionPlan) {
    if (plan.code === "FREE") return;
    const isCurrent = paidActive && activeCode === plan.code;
    if (isCurrent || subscribe.isPending) return;
    subscribe.mutate(plan.code);
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <SettingsPanel>
        <SettingsSectionHeader
          icon={CreditCard}
          title="Abonnement"
          description="Passes et Premium — paiement Paystack (Mobile Money, carte)."
        />

        {sub?.hasActiveSubscription && activeCode !== "FREE" ? (
          <View style={styles.activeBox}>
            <Text style={styles.activeTitle}>Abonnement actif</Text>
            <Text style={styles.activePlan}>{sub.planDetails?.label ?? sub.planDetails?.code}</Text>
            {sub.currentPeriodEnd ? (
              <Text style={styles.activeEnd}>
                Jusqu&apos;au {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
              </Text>
            ) : null}
            {sub.cancelAtPeriodEnd ? (
              <Text style={styles.cancelNote}>Annulation à la fin de la période en cours</Text>
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
                  disabled={isCurrent || subscribe.isPending || (paidActive && !isCurrent)}
                  disabledCtaLabel="Abonnement en cours"
                  ctaContext="settings"
                  onSelect={() => handlePlanSelect(p)}
                />
              </View>
            );
          })
        )}
      </SettingsPanel>

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
              meta={inv.amount != null ? `${inv.amount.toLocaleString("fr-FR")} FCFA` : undefined}
            />
          ))}
        </SettingsPanel>
      ) : null}

      {historyList.length > 0 ? (
        <SettingsPanel>
          <SettingsSectionHeader
            icon={CreditCard}
            title="Historique"
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
    fontWeight: "700",
    color: colors.success,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  activePlan: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  activeEnd: { fontSize: 13, color: colors.muted },
  cancelNote: { fontSize: 12, color: colors.warning, marginTop: 4 },
  cancelBtn: { marginTop: 10, alignSelf: "flex-start" },
  cancelBtnText: { fontSize: 13, color: colors.error, fontWeight: "600" },
});
