import Link from "next/link";
import Image from "next/image";
import { PAGE_MAX } from "../public/PublicShell";

export function Footer() {
  return (
    <footer className="bg-surface/50 border-t border-white/5 mt-auto pb-mobile-nav md:pb-0">
      <div className={`${PAGE_MAX} px-4 py-10`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Image src="/logo/logo_sans_fond.png" alt="iVOD" width={80} height={32} className="h-8 mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plateforme de streaming africaine. Films & séries en XOF.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Découvrir</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/films" className="hover:text-white transition-colors">Films</Link></li>
              <li><Link href="/series" className="hover:text-white transition-colors">Séries</Link></li>
              <li><Link href="/web-series" className="hover:text-white transition-colors">Web-séries</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Compte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/pricing" className="hover:text-white transition-colors">Tarifs & abonnement</Link></li>
              <li><Link href="/settings/subscription" className="hover:text-white transition-colors">Mon abonnement</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors">Paramètres</Link></li>
              <li><Link href="/favorites" className="hover:text-white transition-colors">Favoris</Link></li>
              <li><Link href="/history" className="hover:text-white transition-colors">Historique</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-white transition-colors cursor-pointer">Conditions d&apos;utilisation</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Politique de confidentialité</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Contact</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} iVOD. Tous droits réservés.</p>
          <p>🌍 Afrique francophone — Paiement en XOF (FCFA)</p>
        </div>
      </div>
    </footer>
  );
}
