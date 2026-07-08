"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
import { adminApi } from "@/lib/api/admin";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ApiError } from "@/lib/api/client";
import { inputClsSm } from "@/lib/ui/cinema-field";

interface RefundPaymentButtonProps {
  paymentId: string;
  amount: number;
  disabled?: boolean;
}

export function RefundPaymentButton({ paymentId, amount, disabled }: RefundPaymentButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.refundPayment(paymentId, {
        reason: reason.trim() || "Remboursement administrateur iVOD",
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      toast.success(data?.message ?? "Remboursement initié");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      setOpen(false);
      setReason("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  if (open) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif (visible client)"
          className={`${inputClsSm} h-8 px-2 text-xs`}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-none bg-red-600/90 hover:bg-red-600 text-white disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1.5 text-[11px] rounded-none border border-white/15 text-white/60"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || mutation.isPending}
      onClick={() => setOpen(true)}
      title={`Rembourser ${amount} FCFA`}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-none border border-red-500/35 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
    >
      <RotateCcw size={12} />
      Rembourser
    </button>
  );
}
