import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { paymentsApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { formatXOF } from "@/core/pricing/format";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type PaymentSubmitData = {
  providerCode: "PAYSTACK";
  email: string;
};

type Props = {
  planLabel: string;
  amountFcfa?: number;
  onSubmit: (data: PaymentSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function PaymentForm({
  planLabel,
  amountFcfa,
  onSubmit,
  onCancel,
  isLoading,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState(user?.email ?? "");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const { data: paystackConfig, isLoading: configLoading } = useQuery({
    queryKey: ["paystack-config"],
    queryFn: () => paymentsApi.getPaystackConfig(),
    staleTime: 60 * 60_000,
  });

  const configured = paystackConfig?.configured !== false;
  const canPay = configured && email.trim().includes("@");

  return (
    <PremiumPanel style={styles.panel}>
      <Text style={styles.kicker}>Paiement sécurisé</Text>
      <View style={styles.accent} />
      <Text style={styles.planLabel}>{planLabel}</Text>
      {amountFcfa != null && amountFcfa > 0 ? (
        <Text style={styles.amount}>{formatXOF(amountFcfa)}</Text>
      ) : null}

      <View style={styles.notice}>
        <ShieldCheck color={colors.magenta} size={18} />
        <Text style={styles.noticeText}>
          Paiement via une passerelle sécurisée (carte ou Mobile Money). Transaction chiffrée et conforme PCI-DSS.
        </Text>
      </View>

      {configLoading ? (
        <ActivityIndicator color={colors.magenta} style={{ marginVertical: 16 }} />
      ) : null}

      {paystackConfig?.secretKeyInvalid ? (
        <Text style={styles.warnError}>
          Le paiement est temporairement indisponible sur ce serveur.
        </Text>
      ) : null}

      {paystackConfig?.configured === false && !paystackConfig?.secretKeyInvalid ? (
        <Text style={styles.warnError}>
          Le paiement n&apos;est pas disponible pour le moment.
        </Text>
      ) : null}

      {paystackConfig?.simulationMode ? (
        <Text style={styles.warnSim}>
          Mode démo — aucun débit réel.
        </Text>
      ) : null}

      {paystackConfig?.publicKey?.startsWith("pk_test") && paystackConfig?.configured ? (
        <Text style={styles.warnSim}>
          Mode démo actif.
        </Text>
      ) : null}

      <Input
        label="Email de confirmation"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="vous@exemple.com"
      />

      <View style={styles.actions}>
        <Button title="Annuler" variant="secondary" onPress={onCancel} disabled={isLoading} />
        <Button
          title={isLoading ? "Redirection…" : "Payer"}
          onPress={() =>
            onSubmit({ providerCode: "PAYSTACK", email: email.trim() })
          }
          loading={isLoading}
          disabled={!canPay || isLoading}
        />
      </View>
    </PremiumPanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  kicker: typography.kicker,
  accent: {
    width: 40,
    height: 2,
    backgroundColor: colors.magenta,
    opacity: 0.6,
  },
  planLabel: { ...typography.bodyMuted, fontSize: 14 },
  amount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  warnError: {
    fontSize: 11,
    color: "#f87171",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.08)",
    padding: 10,
    lineHeight: 16,
  },
  warnSim: {
    fontSize: 11,
    color: colors.gold,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    backgroundColor: "rgba(251,191,36,0.06)",
    padding: 10,
    lineHeight: 16,
  },
  actions: { gap: 10, marginTop: 4 },
});
