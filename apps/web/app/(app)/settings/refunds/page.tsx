"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { paymentsApi } from "@/lib/api/payments";
import { formatXOF, formatRelative } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { paymentStatusCode } from "@/lib/utils/payment-status";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsList,
  SettingsListRow,
  SettingsBadge,
  SettingsEmpty,
  SETTINGS_TEXTAREA_CLASS,
} from "@/components/settings/SettingsUI";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  REQUESTED: { label: "Demandé", variant: "warning" },
  APPROVED: { label: "En cours Paystack", variant: "warning" },
  PROCESSED: { label: "Remboursé", variant: "success" },
  REJECTED: { label: "Refusé", variant: "danger" },
};

export default function RefundsPage() {
  const qc = useQueryClient();
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: refunds, isLoading } = useQuery({
    queryKey: ["refunds"],
    queryFn: paymentsApi.getRefunds,
    staleTime: 60_000,
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsApi.list(1, 20),
    staleTime: 5 * 60_000,
  });

  const requestMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      paymentsApi.requestRefund(paymentId, reason || undefined),
    onSuccess: (data) => {
      showApiSuccess(data);
      setExpandedPaymentId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["refunds"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const refundList: any[] = Array.isArray(refunds) ? refunds : [];
  const paymentList: any[] = (payments as any)?.items ?? (Array.isArray(payments) ? payments : []);
  const refundedPaymentIds = new Set(refundList.map((r) => r.paymentId));
  const eligible = paymentList.filter(
    (p: any) =>
      paymentStatusCode(p.status) === "COMPLETED" && !refundedPaymentIds.has(p.id),
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <SettingsPanel>
        <SettingsSectionHeader
          icon={RotateCcw}
          title="Remboursements"
          description="Demandez un remboursement pour un paiement éligible (moins de 30 jours)."
        />

        {paymentList.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-3">
              Paiements éligibles
            </p>
            <SettingsList>
              {eligible.map((payment: any) => (
                <div key={payment.id} className="border-b border-white/[0.06] last:border-0">
                  <SettingsListRow>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString("fr-CI", {
                              dateStyle: "medium",
                            })
                          : "Paiement"}
                      </p>
                      {payment.amount && (
                        <p className="text-xs text-white/45 mt-0.5">{formatXOF(payment.amount)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPaymentId((prev) => (prev === payment.id ? null : payment.id))
                      }
                      className="ivod-btn px-4 py-2 text-xs font-semibold border border-brand-magenta/30 bg-brand-magenta/10 text-brand-magenta hover:bg-brand-magenta/20 transition-colors"
                    >
                      Demander
                    </button>
                  </SettingsListRow>
                  {expandedPaymentId === payment.id && (
                    <div className="px-4 md:px-5 pb-5 space-y-3 bg-black/20">
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motif (optionnel)…"
                        rows={3}
                        className={SETTINGS_TEXTAREA_CLASS}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setExpandedPaymentId(null)}
                          className="px-4 py-2 text-sm text-white/50 hover:text-white"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => requestMutation.mutate({ paymentId: payment.id, reason })}
                          disabled={requestMutation.isPending}
                          className="ivod-btn ivod-btn-primary inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold disabled:opacity-50"
                        >
                          {requestMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {eligible.length === 0 && (
                <div className="flex items-center gap-3 px-5 py-6 text-sm text-white/45">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  Aucun paiement éligible.
                </div>
              )}
            </SettingsList>
          </>
        )}
      </SettingsPanel>

      <SettingsPanel>
        <SettingsSectionHeader title="Mes demandes" description="Suivi de vos demandes de remboursement." />

        {isLoading ? (
          <BrandLoader fullScreen={false} size="sm" tagline="Remboursements" className="py-12" />
        ) : refundList.length === 0 ? (
          <SettingsEmpty icon={RotateCcw} title="Aucune demande" description="Vos demandes apparaîtront ici." />
        ) : (
          <SettingsList>
            {refundList.map((refund: any) => {
              const badge = STATUS_LABELS[refund.status] ?? {
                label: refund.status,
                variant: "default" as const,
              };
              return (
                <SettingsListRow key={refund.id}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {refund.reason ?? "Demande de remboursement"}
                    </p>
                    {refund.createdAt && (
                      <p className="text-xs text-white/40 mt-0.5">{formatRelative(refund.createdAt)}</p>
                    )}
                  </div>
                  <SettingsBadge variant={badge.variant}>{badge.label}</SettingsBadge>
                  {refund.amount && (
                    <span className="text-xs text-white/45 tabular-nums">{formatXOF(refund.amount)}</span>
                  )}
                </SettingsListRow>
              );
            })}
          </SettingsList>
        )}
      </SettingsPanel>

      <div className="flex items-start gap-3 p-4 md:p-5 border border-white/[0.08] bg-white/[0.02] text-xs text-white/45 leading-relaxed">
        <AlertCircle size={16} className="shrink-0 text-brand-gold mt-0.5" />
        <p>
          Traitement sous 5 à 10 jours ouvrés. Seuls les paiements de moins de 30 jours sont éligibles.
        </p>
      </div>
    </div>
  );
}
