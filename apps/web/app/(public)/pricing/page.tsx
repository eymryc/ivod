import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-page-client";

export const metadata: Metadata = {
  title: "Tarifs — iVOD",
  description:
    "Gratuit avec pub, Pass 24h à 150 FCFA, Pass semaine 500 FCFA ou Premium 1 500 FCFA/mois. Paiement Mobile Money via Paystack.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
