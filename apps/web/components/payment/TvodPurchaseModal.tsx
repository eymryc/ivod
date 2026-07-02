"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { paymentsApi } from "@/lib/api/payments";
import { PaymentForm } from "./PaymentForm";
import { formatXOF } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { showApiError } from "@/lib/api/feedback";
import { BrandLoaderMark } from "@/components/ui/BrandLoader";
import {
  isPaymentCompleted,
  isPaymentFailed,
} from "@/lib/utils/payment-status";

interface TvodPurchaseModalProps {
  contentId: string;
  contentTitle: string;
  ppvPrice: number;
  onClose: () => void;
}

type Step = "form" | "pending" | "success" | "error";

export function TvodPurchaseModal({
  contentId,
  contentTitle,
  ppvPrice,
  onClose,
}: TvodPurchaseModalProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("form");

  const initiateMutation = useMutation({
    mutationFn: (data: { email: string }) =>
      paymentsApi.initiatePayment({
        amount: ppvPrice,
        providerCode: "PAYSTACK",
        email: data.email,
        contentId,
      }),
    onSuccess: (result) => {
      const pid = result.paymentId ?? result.id;
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      if (pid) {
        setStep("pending");
        pollPayment(pid);
      } else {
        setStep("error");
      }
    },
    onError: (err: ApiError) => {
      showApiError(err);
      setStep("error");
    },
  });

  const pollPayment = (pid: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const payment = await paymentsApi.getOne(pid);
        if (isPaymentCompleted(payment.status)) {
          clearInterval(interval);
          setStep("success");
          qc.invalidateQueries({ queryKey: ["entitlement", contentId] });
        } else if (isPaymentFailed(payment.status) || attempts > 24) {
          clearInterval(interval);
          setStep("error");
        }
      } catch {
        if (attempts > 24) {
          clearInterval(interval);
          setStep("error");
        }
      }
    }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
        {step === "form" && (
          <>
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag size={18} className="text-primary" />
                  <h2 className="text-lg font-bold">Acheter ce contenu</h2>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{contentTitle}</p>
                <p className="text-2xl font-bold text-primary mt-2">{formatXOF(ppvPrice)}</p>
                <p className="text-xs text-muted-foreground">Accès illimité · Paiement Paystack</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <PaymentForm
                planLabel={`${contentTitle} — ${formatXOF(ppvPrice)}`}
                amountFcfa={ppvPrice}
                onSubmit={(data) => initiateMutation.mutate({ email: data.email })}
                onCancel={onClose}
                isLoading={initiateMutation.isPending}
              />
            </div>
          </>
        )}

        {step === "pending" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <BrandLoaderMark size="md" showTagline={false} />
            <h2 className="text-lg font-bold">Paiement en cours…</h2>
            <p className="text-sm text-muted-foreground">
              Complétez le paiement sur Paystack. Cette fenêtre se met à jour automatiquement.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={48} className="text-green-400" />
            <h2 className="text-lg font-bold">Achat confirmé</h2>
            <p className="text-sm text-muted-foreground">
              Vous pouvez regarder{" "}
              <span className="text-white font-medium">{contentTitle}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/watch/${contentId}`);
              }}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Regarder maintenant
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <XCircle size={48} className="text-red-400" />
            <h2 className="text-lg font-bold">Paiement échoué</h2>
            <p className="text-sm text-muted-foreground">Réessayez avec Paystack.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-surface border border-white/10 text-white rounded-xl text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
