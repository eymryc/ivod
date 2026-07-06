"use client";

import { CreditCard, Smartphone, ShieldCheck } from "lucide-react";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Bandeau confiance paiement — FCFA, Paystack, Mobile Money */
export function TrustPaymentBar({ className = "", compact = false }: Props) {
  return (
    <div
      className={`trust-payment-bar flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border border-white/[0.08] bg-white/[0.02] px-4 py-3 md:px-6 md:py-4 ${className}`}
      role="note"
      aria-label="Moyens de paiement sécurisés"
    >
      <span className="inline-flex items-center gap-2 text-caption font-medium text-secondary-token">
        <ShieldCheck size={14} className="text-brand-magenta shrink-0" />
        Paiement sécurisé
      </span>
      {!compact && (
        <>
          <span className="hidden sm:block h-4 w-px bg-white/10" aria-hidden />
          <span className="text-body text-secondary-token">Paystack</span>
          <span className="inline-flex items-center gap-1.5 text-body text-secondary-token">
            <Smartphone size={14} className="text-brand-gold shrink-0" />
            Mobile Money
          </span>
          <span className="inline-flex items-center gap-1.5 text-body text-secondary-token">
            <CreditCard size={14} className="text-white/50 shrink-0" />
            Carte bancaire
          </span>
        </>
      )}
      <span className="text-body font-semibold text-primary-token">100 % en FCFA</span>
    </div>
  );
}
