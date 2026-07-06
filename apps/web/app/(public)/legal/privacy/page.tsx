import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_MAX } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité — iVOD",
};

export default function PrivacyPage() {
  return (
    <div className={`${PAGE_MAX} py-10 md:py-14`}>
      <p className="text-caption font-semibold text-brand-magenta mb-2">
        Légal
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
        Politique de confidentialité
      </h1>
      <div className="ivod-line-accent w-14 mb-8" />
      <div className="space-y-4 text-sm md:text-[15px] text-white/65 leading-relaxed max-w-3xl">
        <p>
          iVOD collecte les données nécessaires à la création de compte, à la facturation et à
          l&apos;amélioration du service (email, historique de visionnage, préférences de profil).
        </p>
        <p>
          Les paiements sont traités par nos prestataires certifiés (ex. Paystack). Nous ne
          stockons pas vos numéros de carte complets sur nos serveurs.
        </p>
        <p>
          Vous pouvez exercer vos droits d&apos;accès, de rectification et de suppression via les{" "}
          <Link href="/settings/privacy" className="text-brand-magenta hover:underline">
            paramètres de confidentialité
          </Link>{" "}
          (compte connecté) ou en nous contactant.
        </p>
        <p className="text-white/40 text-xs">
          Document indicatif — version complète à publier avec votre DPO ou conseil juridique.
        </p>
      </div>
    </div>
  );
}
