import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page introuvable — iVOD" };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center gap-6">
      <Image src="/logo/logo_sans_fond.png" alt="iVOD" width={80} height={32} className="h-8 opacity-60" loading="eager" />
      <div>
        <p className="text-8xl font-black text-primary/20 leading-none">404</p>
        <h1 className="text-2xl font-bold mt-2">Page introuvable</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Cette page n&apos;existe pas ou a été déplacée. Retournez au catalogue pour continuer à explorer.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors">
          Retour à l&apos;accueil
        </Link>
        <Link href="/films" className="px-6 py-3 bg-surface border border-white/10 hover:border-white/25 text-white rounded-xl text-sm transition-colors">
          Explorer le catalogue
        </Link>
      </div>
    </div>
  );
}
