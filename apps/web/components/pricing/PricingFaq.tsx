"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "Comment payer ?",
    a: "Tous les paiements passent par Paystack : carte bancaire ou Mobile Money selon les options affichées sur la page Paystack. Montants en FCFA (XOF). iVOD ne débite pas directement les opérateurs.",
  },
  {
    q: "Quelle différence entre gratuit et Premium ?",
    a: "Le compte gratuit donne accès aux contenus publics avec publicité. Les passes et Premium débloquent le catalogue abonnés, sans pub, en meilleure qualité et avec téléchargements selon le plan.",
  },
  {
    q: "Puis-je acheter un seul film ?",
    a: "Oui. Les titres « à l'unité » (TVOD) se paient une fois sur la fiche du contenu — accès illimité après achat, sans abonnement.",
  },
  {
    q: "Le pass 24h se renouvelle-t-il automatiquement ?",
    a: "Non, sauf si vous souscrivez à nouveau. Le pass expire à la fin de la période (24h, 7 jours ou 30 jours selon l'offre).",
  },
  {
    q: "Comment annuler ?",
    a: "Les passes ne se renouvellent pas automatiquement. Pour Premium, annulez dans Paramètres → Abonnement : l'accès reste actif jusqu'à la fin de la période payée.",
  },
] as const;

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2 max-w-2xl mx-auto">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className={`pricing-faq-item overflow-hidden ${isOpen ? "pricing-faq-item--open" : ""}`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-white hover:bg-white/[0.03] transition-colors"
            >
              <span className={isOpen ? "ivod-gradient-text" : undefined}>{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-brand-magenta" : "text-white/40"
                }`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm text-white/55 leading-relaxed border-t border-white/[0.06] pt-3">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
