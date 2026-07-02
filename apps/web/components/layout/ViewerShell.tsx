import { Suspense, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { NavbarFallback } from "@/components/layout/NavbarFallback";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

type ViewerShellProps = {
  children: ReactNode;
  /** Cookie JWT présent au SSR — aligne la nav avant hydratation client */
  serverHasSession?: boolean;
  /** Barre de navigation fixe en haut */
  showNavbar?: boolean;
  /** Pied de page catalogue */
  showFooter?: boolean;
  /** Barre d’onglets mobile en bas */
  showMobileNav?: boolean;
  /** Décalage sous la navbar (désactiver pour hero plein écran type accueil) */
  mainOffsetTop?: boolean;
  /** Classes additionnelles sur <main> */
  mainClassName?: string;
};

const MAIN_BASE = "flex-1 overflow-x-hidden";
const MAIN_OFFSET_TOP = "pt-[3.75rem]";
const MAIN_MOBILE_NAV = "pb-mobile-nav md:pb-0";

export function ViewerShell({
  children,
  serverHasSession = false,
  showNavbar = true,
  showFooter = true,
  showMobileNav = true,
  mainOffsetTop = true,
  mainClassName = "",
}: ViewerShellProps) {
  return (
    <div className="min-h-screen flex flex-col page-canvas">
      {showNavbar && (
        <Suspense fallback={<NavbarFallback />}>
          <Navbar serverHasSession={serverHasSession} />
        </Suspense>
      )}
      <main
        className={[
          MAIN_BASE,
          mainOffsetTop ? MAIN_OFFSET_TOP : "",
          showMobileNav ? MAIN_MOBILE_NAV : "",
          mainClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      {showFooter && <Footer />}
      {showMobileNav && <MobileNav />}
    </div>
  );
}
