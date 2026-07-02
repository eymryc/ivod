import Image from "next/image";
import Link from "next/link";
import { Clapperboard, Play, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,400px)_1fr] bg-background">
      {/* Panneau marque — desktop (colonne étroite, contenu lisible) */}
      <aside className="hidden lg:flex flex-col justify-center relative overflow-hidden border-r border-white/[0.08] bg-background-elevated shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-purple/20 via-background-elevated to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-none bg-brand-magenta/20 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-none bg-brand-gold/12 blur-[70px] pointer-events-none" />

        <div className="relative px-8 xl:px-10 py-12">
          <Link href="/" className="inline-block">
            <Image
              src="/logo/logo_sans_fond.png"
              alt="iVOD"
              width={160}
              height={64}
              className="h-12 w-auto drop-shadow-[0_0_24px_rgba(230,0,126,0.2)]"
              loading="eager"
            />
          </Link>
          <p className="mt-8 text-[11px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text">
            Cinéma & séries africains
          </p>
          <h2 className="mt-3 text-2xl xl:text-[1.65rem] font-semibold text-white tracking-tight leading-snug">
            Votre plateforme VOD, pensée pour l&apos;Afrique
          </h2>
          <div className="mt-3 ivod-line-accent w-12" />
          <p className="mt-4 text-[14px] text-white/65 font-light leading-relaxed">
            Films, séries et créateurs locaux — en streaming, où que vous soyez.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: Play, text: "Catalogue en croissance continue" },
              { icon: Clapperboard, text: "Espace créateur intégré" },
              { icon: Sparkles, text: "Expérience premium, charte IVOD" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13px] text-white/70">
                <span className="ivod-btn flex h-9 w-9 shrink-0 items-center justify-center border border-brand-magenta/30 bg-brand-purple/15">
                  <Icon size={16} className="text-brand-magenta" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-6 left-8 xl:left-10 right-8 text-[11px] text-white/35 font-light">
          © {new Date().getFullYear()} iVOD · Tous droits réservés
        </p>
      </aside>

      {/* Formulaire — zone principale */}
      <main className="flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-10 lg:py-12 pb-safe relative bg-background-deep lg:bg-background min-h-screen">
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Image
              src="/logo/logo_sans_fond.png"
              alt="iVOD"
              width={100}
              height={40}
              className="h-9 w-auto"
              loading="eager"
            />
          </Link>
        </div>

        <div className="w-full max-w-[440px] lg:max-w-[460px]">{children}</div>

        <p className="mt-8 text-[11px] text-white/25 text-center font-light lg:hidden">
          © {new Date().getFullYear()} iVOD
        </p>
      </main>
    </div>
  );
}
