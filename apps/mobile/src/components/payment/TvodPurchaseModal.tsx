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
import * as WebBrowser from "expo-web-browser";
import { X, ShoppingBag, CheckCircle2, XCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { paymentsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatXOF } from "@/core/pricing/format";
import { isPaymentCompleted, isPaymentFailed } from "@/presentation/utils/payment-status";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Step = "form" | "pending" | "success" | "error";

interface Props {
  contentId: string;
  contentTitle: string;
  ppvPrice: number;
  onClose: () => void;
}

export function TvodPurchaseModal({ contentId, contentTitle, ppvPrice, onClose }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(user?.email ?? "");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPoll(paymentId: string) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        if (attempts === 1) {
          try {
            await paymentsApi.syncPayment(paymentId);
          } catch {
            /* webhook */
          }
        }
        const payment = await paymentsApi.getOne(paymentId);
        if (isPaymentCompleted((payment as { status?: unknown }).status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          qc.invalidateQueries({ queryKey: QueryKeys.content.all() });
          qc.invalidateQueries({ queryKey: QueryKeys.content.entitlementPrefix(contentId) });
        } else if (
          isPaymentFailed((payment as { status?: unknown }).status) ||
          attempts > 24
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("error");
        }
      } catch {
        if (attempts > 24 && pollRef.current) {
          clearInterval(pollRef.current);
          setStep("error");
        }
      }
    }, 5000);
  }

  const initiate = useMutation({
    mutationFn: () =>
      paymentsApi.initiatePayment({
        amount: ppvPrice,
        providerCode: "PAYSTACK",
        email: email.trim(),
        contentId,
      }),
    onSuccess: async (result) => {
      const res = result as {
        paymentId?: string;
        id?: string;
        redirectUrl?: string;
        payment?: { id?: string; redirectUrl?: string };
      };
      const pid = res.paymentId ?? res.id ?? res.payment?.id;
      const redirect = res.redirectUrl ?? res.payment?.redirectUrl;
      if (redirect) {
        await WebBrowser.openBrowserAsync(redirect);
        if (pid) {
          setStep("pending");
          startPoll(pid);
        } else {
          setStep("error");
        }
        return;
      }
      if (pid) {
        setStep("pending");
        startPoll(pid);
      } else {
        setStep("error");
      }
    },
    onError: () => setStep("error"),
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
              <Text style={styles.hint}>Accès illimité · Paiement Paystack</Text>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button
                title="Payer avec Paystack"
                onPress={() => initiate.mutate()}
                loading={initiate.isPending}
              />
            </>
          ) : null}

          {step === "pending" ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.magenta} />
              <Text style={styles.pendingTitle}>Paiement en cours…</Text>
              <Text style={styles.pendingHint}>
                Finalisez le paiement dans le navigateur. Cette fenêtre se met à jour automatiquement.
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
                <Button title="Réessayer" onPress={() => setStep("form")} />
                <Button title="Annuler" variant="ghost" onPress={onClose} />
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
  hint: { ...typography.caption, marginBottom: 8 },
  center: { alignItems: "center", gap: 12, paddingVertical: 16 },
  pendingTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  pendingHint: { ...typography.bodyMuted, textAlign: "center" },
  cta: { paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700" },
  errorBtns: { gap: 10, width: "100%", marginTop: 8 },
});
