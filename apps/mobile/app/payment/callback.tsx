import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { paymentsApi } from "@/infrastructure/api";
import { InnerPage } from "@/components/layout/InnerPage";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { Button } from "@/components/ui/Button";
import {
  isPaymentCompleted,
  isPaymentFailed,
  paymentStatusCode,
} from "@/presentation/utils/payment-status";
import { navigateExpoPath } from "@/presentation/utils/expo-router-path";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

const DEFAULT_SUCCESS_PATH = "/settings/subscription?paid=1";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    paymentId?: string;
    reference?: string;
    trxref?: string;
    sim?: string;
    returnTo?: string;
    browser?: string;
  }>();
  /** Id interne iVOD — toujours utilisé pour sync/getOne (≠ référence prestataire après relance). */
  const paymentId =
    params.paymentId ?? params.reference ?? params.trxref ?? "";
  const isSim = params.sim === "1";
  const returnTo = params.returnTo;
  const successPath =
    returnTo && returnTo.startsWith("/") ? returnTo : DEFAULT_SUCCESS_PATH;
  const [pollCount, setPollCount] = useState(0);
  const [simConfirmed, setSimConfirmed] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    paymentsApi.syncPayment(paymentId).catch(() => {});
  }, [paymentId]);

  const { data: payment, refetch, isError } = useQuery({
    queryKey: ["payment-callback", paymentId],
    queryFn: () => paymentsApi.getOne(paymentId),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const p = query.state.data;
      if (!p) return 3000;
      const code = paymentStatusCode(p.status);
      if (code === "COMPLETED" || code === "FAILED") return false;
      return pollCount < 40 ? 3000 : false;
    },
  });

  useEffect(() => {
    if (!paymentId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      paymentsApi.syncPayment(paymentId).catch(() => {});
      refetch();
    });
    return () => sub.remove();
  }, [paymentId, refetch]);

  useEffect(() => {
    if (!paymentId) return;
    const t = setInterval(() => setPollCount((c) => c + 1), 3000);
    return () => clearInterval(t);
  }, [paymentId]);

  useEffect(() => {
    if (!isPaymentCompleted(payment?.status)) return;
    qc.invalidateQueries({ queryKey: ["subscription-me"] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    const t = setTimeout(() => navigateExpoPath(router, successPath, "replace"), 2000);
    return () => clearTimeout(t);
  }, [payment?.status, router, successPath, qc]);

  const confirmSimPayment = () => {
    if (!paymentId) return;
    setSimConfirmed(true);
    paymentsApi.devComplete(paymentId).then(() => refetch());
  };

  if (isSim && paymentId && !isPaymentCompleted(payment?.status) && !simConfirmed) {
    return (
      <StateView
        icon={<ActivityIndicator color={colors.gold} size={40} />}
        title="Mode simulation"
        message="Mode démo : aucun débit réel. Confirmez pour tester l'activation d'abonnement."
        sub={paymentId}
        primaryLabel="Simuler un paiement réussi"
        onPrimary={confirmSimPayment}
        secondaryLabel="Annuler"
        onSecondary={() => navigateExpoPath(router, "/settings/subscription", "replace")}
      />
    );
  }

  if (!paymentId) {
    return (
      <StateView
        icon={<XCircle color="#f87171" size={48} />}
        title="Référence manquante"
        message="Retournez à la boutique et relancez le paiement."
        primaryLabel="Mes abonnements"
        onPrimary={() => navigateExpoPath(router, "/settings/subscription", "replace")}
      />
    );
  }

  if (isError) {
    return (
      <StateView
        icon={<XCircle color="#f87171" size={48} />}
        title="Paiement introuvable"
        message="Connectez-vous avec le même compte ou contactez le support."
        primaryLabel="Réessayer"
        onPrimary={() => navigateExpoPath(router, "/settings/subscription", "replace")}
      />
    );
  }

  if (!payment) {
    return (
      <StateView
        icon={<ActivityIndicator color={colors.magenta} size={40} />}
        title="Vérification en cours…"
        message="Nous confirmons votre paiement auprès du prestataire."
      />
    );
  }

  if (isPaymentCompleted(payment.status)) {
    return (
      <StateView
        icon={<CheckCircle2 color="#4ade80" size={48} />}
        title="Paiement confirmé"
        message="Votre accès est activé. Redirection automatique…"
        primaryLabel="Voir mon abonnement"
        onPrimary={() => navigateExpoPath(router, successPath, "replace")}
      />
    );
  }

  if (isPaymentFailed(payment.status)) {
    return (
      <StateView
        icon={<XCircle color="#f87171" size={48} />}
        title="Paiement échoué"
        message="Le paiement n'a pas été validé. Vous pouvez réessayer."
        primaryLabel="Réessayer"
        onPrimary={() => navigateExpoPath(router, "/settings/subscription", "replace")}
        secondaryLabel="Actualiser"
        onSecondary={() => refetch()}
      />
    );
  }

  return (
    <StateView
      icon={<ActivityIndicator color={colors.magenta} size={40} />}
      title="Paiement en cours…"
      message={
        params.browser === "1"
          ? "Si vous avez terminé le paiement dans le navigateur, revenez à l'app ou patientez quelques secondes."
          : "Si vous avez terminé le paiement, patientez quelques secondes."
      }
      secondaryLabel="Actualiser"
      onSecondary={() => refetch()}
    />
  );
}

function StateView({
  icon,
  title,
  message,
  sub,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  sub?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <InnerPage>
      <View style={styles.center}>
        <PremiumPanel style={styles.panel}>
          <View style={styles.icon}>{icon}</View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {primaryLabel && onPrimary ? (
            <Button title={primaryLabel} onPress={onPrimary} style={styles.btn} />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button title={secondaryLabel} variant="secondary" onPress={onSecondary} />
          ) : null}
        </PremiumPanel>
      </View>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: 24 },
  panel: { alignItems: "center", gap: 12, padding: 28 },
  icon: { marginBottom: 8 },
  title: { ...typography.h2, textAlign: "center" },
  message: { ...typography.bodyMuted, textAlign: "center", lineHeight: 22 },
  sub: { fontSize: 11, fontFamily: "monospace", color: colors.muted, textAlign: "center" },
  btn: { marginTop: 8, alignSelf: "stretch" },
});
