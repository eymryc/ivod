import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PAGE_MAX } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Contact — iVOD",
};

export default function ContactPage() {
  return (
    <div className={`${PAGE_MAX} py-10 md:py-14`}>
      <p className="text-caption font-semibold text-brand-magenta mb-2">
        Support
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">Contact</h1>
      <div className="ivod-line-accent w-14 mb-8" />
      <div className="max-w-xl space-y-6 text-sm md:text-[15px] text-white/65 leading-relaxed">
        <p>
          Une question sur votre abonnement, un problème de lecture ou une demande partenaire ?
          Écrivez-nous :
        </p>
        <a
          href="mailto:support@ivod.africa"
          className="ivod-btn inline-flex items-center gap-3 border border-white/10 bg-white/[0.03] px-5 py-3.5 text-white hover:border-brand-magenta/35 hover:text-brand-magenta transition-colors"
        >
          <Mail size={18} className="shrink-0" />
          support@ivod.africa
        </a>
        <p>
          Consultez aussi la page{" "}
          <Link href="/pricing" className="text-brand-magenta hover:underline">
            Tarifs
          </Link>{" "}
          pour les questions d&apos;abonnement.
        </p>
      </div>
    </div>
  );
}
