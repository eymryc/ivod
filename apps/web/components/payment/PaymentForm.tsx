"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, ShieldCheck, ArrowRight, Smartphone } from "lucide-react";
import { paymentsApi } from "@/lib/api/payments";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { formatXOF } from "@/lib/utils/format";
import { SETTINGS_INPUT_CLASS } from "@/components/settings/SettingsUI";

const schema = z.object({
  email: z.string().email("Email valide requis"),
});
type FormData = z.infer<typeof schema>;

export interface PaymentSubmitData {
  providerCode: "PAYSTACK";
  email: string;
  phoneNumber?: string;
  promoCode?: string;
}

interface PaymentFormProps {
  planLabel: string;
  amountFcfa?: number;
  onSubmit: (data: PaymentSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PaymentForm({ planLabel, amountFcfa, onSubmit, onCancel, isLoading }: PaymentFormProps) {
  const { user } = useAuthSession();

  const { data: paystackConfig } = useQuery({
    queryKey: ["paystack-config"],
    queryFn: paymentsApi.getPaystackConfig,
    staleTime: 60 * 60_000,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? "" },
  });

  useEffect(() => {
    if (user?.email) setValue("email", user.email);
  }, [user?.email, setValue]);

  return (
    <div className="payment-form-panel w-full">
      <div className="payment-form-panel__glow" aria-hidden />

      <header className="relative mb-6">
        <p className="text-caption font-semibold text-brand-magenta mb-2">
          Paiement sécurisé
        </p>
        <div className="ivod-line-accent w-10 mb-4" />
        <p className="text-sm text-white/50 mb-1">{planLabel}</p>
        {amountFcfa != null && amountFcfa > 0 && (
          <p className="text-2xl md:text-3xl font-bold tracking-tight text-brand-magenta">
            {formatXOF(amountFcfa)}
          </p>
        )}
      </header>

      <div className="relative flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-brand-gold/30 bg-brand-gold/10 text-[11px] font-semibold text-brand-gold">
          <Smartphone size={12} />
          Mobile Money
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 bg-white/[0.03] text-[11px] font-medium text-white/55">
          100 % FCFA
        </span>
      </div>

      <div className="relative flex items-start gap-3 p-4 mb-6 border border-white/[0.08] bg-white/[0.02]">
        <ShieldCheck size={18} className="text-brand-magenta shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-xs text-white/55 leading-relaxed">
          Paiement via une passerelle sécurisée (carte ou Mobile Money selon disponibilité). Transaction
          chiffrée et conforme PCI-DSS.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) =>
          onSubmit({ providerCode: "PAYSTACK", email: data.email.trim() }),
        )}
        className="relative space-y-5"
      >
        <div>
          <label
            htmlFor="payment-email"
            className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-white/45 mb-2"
          >
            Email de confirmation
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            />
            <input
              id="payment-email"
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              className={`${SETTINGS_INPUT_CLASS} pl-11`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>
          )}
        </div>

        {paystackConfig?.secretKeyInvalid && (
          <p className="text-[11px] text-red-400/95 border border-red-500/25 bg-red-500/10 px-3 py-2 leading-relaxed">
            Le paiement est temporairement indisponible. Réessayez dans quelques minutes.
          </p>
        )}

        {paystackConfig?.configured === false && !paystackConfig?.secretKeyInvalid && (
          <p className="text-[11px] text-red-400/95 border border-red-500/25 bg-red-500/10 px-3 py-2 leading-relaxed">
            Le paiement n’est pas disponible pour le moment.
          </p>
        )}

        {paystackConfig?.simulationMode && (
          <p className="text-[11px] text-amber-400/90 border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            Mode démo — aucun débit réel.
          </p>
        )}

        {paystackConfig?.configured && paystackConfig?.publicKey?.startsWith("pk_test") && (
          <p className="text-[11px] text-amber-400/90 border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            Mode démo actif.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="ivod-btn flex-1 h-11 border border-white/[0.12] bg-white/[0.03] text-sm font-medium text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-colors touch-manipulation disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading || !paystackConfig?.configured}
            className="ivod-btn ivod-btn-primary flex-1 h-11 text-sm font-semibold inline-flex items-center justify-center gap-2 touch-manipulation disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Redirection…
              </>
            ) : (
              <>
                Payer
                <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
