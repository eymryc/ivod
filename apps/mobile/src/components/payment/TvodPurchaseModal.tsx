import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ShoppingBag, CheckCircle2, XCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { paymentsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { usePaymentCheckout } from "@/presentation/hooks/use-payment-checkout";
import { buildPaystackCallbackBase } from "@/core/config/payment";
import { pollPaymentStatus } from "@/presentation/utils/poll-payment";
import { toast } from "@/presentation/utils/toast";
import { formatXOF } from "@/core/pricing/format";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Step = "form" | "pending" | "success" | "error";

interface Props {
  contentId: string;
  contentTitle: string;
  ppvPrice: number;
  onClose: () => void;
}

type InitiateResponse = {
  paymentId?: string;
  id?: string;
  redirectUrl?: string;
  simulationMode?: boolean;
  payment?: { id?: string; redirectUrl?: string };
};

export function TvodPurchaseModal({ contentId, contentTitle, ppvPrice, onClose }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { openCheckout } = usePaymentCheckout();
  const [step, setStep] = useState<Step>("form");
  const pollCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pollCleanup.current?.();
    };
  }, []);

  const invalidateEntitlement = () => {
    qc.invalidateQueries({ queryKey: QueryKeys.content.all() });
    qc.invalidateQueries({ queryKey: QueryKeys.content.entitlementPrefix(contentId) });
  };

  const initiate = useMutation({
    mutationFn: (data: { email: string }) =>
      paymentsApi.initiatePayment({
        amount: ppvPrice,
        providerCode: "PAYSTACK",
        email: data.email,
        contentId,
        callbackUrl: buildPaystackCallbackBase({
          returnTo: `/watch/${contentId}`,
        }),
      }) as Promise<InitiateResponse>,
    onSuccess: async (result) => {
      const pid = result.paymentId ?? result.id ?? result.payment?.id;
      const redirectUrl = result.redirectUrl ?? result.payment?.redirectUrl;

      if (result.simulationMode) {
        toast.info("Mode démo : aucun débit réel.");
      }

      if (!pid) {
        setStep("error");
        return;
      }

      if (redirectUrl) {
        onClose();
        await openCheckout({
          paymentId: pid,
          redirectUrl,
          simulationMode: result.simulationMode,
          returnTo: `/watch/${contentId}`,
        });
        return;
      }

      setStep("pending");
      pollCleanup.current?.();
      pollCleanup.current = pollPaymentStatus({
        paymentId: pid,
        onCompleted: () => {
          invalidateEntitlement();
          setStep("success");
        },
        onFailed: () => setStep("error"),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setStep("error");
    },
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <X color={colors.muted} size={22} />
          </TouchableOpacity>

          {step === "form" ? (
            <>
              <View style={styles.head}>
                <ShoppingBag color={colors.magenta} size={22} />
                <Text style={styles.title}>Acheter ce contenu</Text>
              </View>
              <Text style={styles.subtitle} numberOfLines={2}>
                {contentTitle}
              </Text>
              <Text style={styles.price}>{formatXOF(ppvPrice)}</Text>
              <Text style={styles.hint}>Accès illimité · Paiement sécurisé</Text>
              <PaymentForm
                planLabel={`${contentTitle} — ${formatXOF(ppvPrice)}`}
                amountFcfa={ppvPrice}
                onSubmit={(data) => initiate.mutate({ email: data.email })}
                onCancel={onClose}
                isLoading={initiate.isPending}
              />
            </>
          ) : null}

          {step === "pending" ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.magenta} />
              <Text style={styles.pendingTitle}>Paiement en cours…</Text>
              <Text style={styles.pendingHint}>
                Finalisez le paiement dans le navigateur. Cette fenêtre se met à jour
                automatiquement.
              </Text>
            </View>
          ) : null}

          {step === "success" ? (
            <View style={styles.center}>
              <CheckCircle2 color={colors.success} size={48} />
              <Text style={styles.pendingTitle}>Achat confirmé</Text>
              <Text style={styles.pendingHint}>Vous pouvez regarder {contentTitle}.</Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push(`/watch/${contentId}` as never);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...gradients.primaryBtn]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaText}>Regarder maintenant</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}

          {step === "error" ? (
            <View style={styles.center}>
              <XCircle color={colors.error} size={48} />
              <Text style={styles.pendingTitle}>Paiement échoué</Text>
              <View style={styles.errorBtns}>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setStep("form")}>
                  <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,5,13,0.85)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  close: { alignSelf: "flex-end" },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { ...typography.h3, fontSize: 18 },
  subtitle: { ...typography.bodyMuted },
  price: { fontSize: 26, fontWeight: "800", color: colors.magenta },
  hint: { ...typography.caption, marginBottom: 4 },
  center: { alignItems: "center", gap: 12, paddingVertical: 16 },
  pendingTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  pendingHint: { ...typography.bodyMuted, textAlign: "center" },
  cta: { paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700" },
  errorBtns: { gap: 12, width: "100%", marginTop: 8, alignItems: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.magenta,
    width: "100%",
    alignItems: "center",
  },
  retryText: { color: "#fff", fontWeight: "700" },
  cancelText: { color: colors.muted, fontWeight: "600" },
});
