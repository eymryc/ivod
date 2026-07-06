import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_MAX } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — iVOD",
};

export default function TermsPage() {
  return (
    <div className={`${PAGE_MAX} py-10 md:py-14`}>
      <p className="text-caption font-semibold text-brand-magenta mb-2">
        Légal
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
        Conditions d&apos;utilisation
      </h1>
      <div className="ivod-line-accent w-14 mb-8" />
      <div className="prose-readable space-y-4 text-sm md:text-[15px] text-white/65 leading-relaxed max-w-3xl">
        <p>
          En utilisant iVOD, vous acceptez les présentes conditions. La plateforme propose un accès
          à des contenus audiovisuels en streaming, avec des offres gratuites (AVOD), par
          abonnement (SVOD) ou à l&apos;unité (TVOD), selon les titres.
        </p>
        <p>
          Vous vous engagez à utiliser le service de manière personnelle et non commerciale, à ne
          pas contourner les mesures de protection des contenus et à respecter la législation
          applicable dans votre pays.
        </p>
        <p>
          iVOD se réserve le droit de suspendre un compte en cas d&apos;usage frauduleux ou de
          violation des présentes conditions. Les tarifs et formules d&apos;abonnement sont
          détaillés sur la page{" "}
          <Link href="/pricing" className="text-brand-magenta hover:underline">
            Tarifs
          </Link>
          .
        </p>
        <p className="text-white/40 text-xs">
          Document indicatif — version complète à publier avec votre conseil juridique.
        </p>
      </div>
    </div>
  );
}
