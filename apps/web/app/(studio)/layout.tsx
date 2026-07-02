"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  BarChart2,
  DollarSign,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useAuthStore, isCreator, isAdmin } from "@/lib/stores/auth.store";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthHydrated } from "@/lib/hooks/useAuthHydrated";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { BrandLoader } from "@/components/ui/BrandLoader";

const NAV = [
  { href: "/studio", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/studio/contents", icon: Film, label: "Mes contenus" },
  { href: "/studio/analytics", icon: BarChart2, label: "Statistiques" },
  { href: "/studio/revenue", icon: DollarSign, label: "Revenus" },
] as const;

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (!isCreator(user) && !isAdmin(user)) {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated) return <BrandLoader />;
  if (!isAuthenticated || (!isCreator(user) && !isAdmin(user))) return null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Compte";

  return (
    <div className="studio-shell flex min-h-svh bg-[#06060a]">
      {/* Sidebar desktop — fixe à l'écran pendant le scroll de la page */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-svh md:w-[220px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0a0a0c]">
        <div className="shrink-0 p-5 border-b border-white/[0.06]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-primary transition-colors mb-5"
          >
            <ChevronLeft size={14} />
            Retour au site
          </Link>
          <Image
            src="/logo/logo_sans_fond.png"
            alt="iVOD"
            width={80}
            height={32}
            className="h-7 w-auto"
            loading="eager"
          />
          <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-primary/60 mt-2">
            Creator Studio
          </p>
          <div className="mt-2 h-px w-8 bg-gradient-to-r from-primary to-secondary/50 rounded-full" />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active =
              href === "/studio" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-white/45 hover:text-white/80 hover:bg-white/[0.03]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                )}
                <Icon size={16} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-3 border-t border-white/[0.06]">
          <div className="px-3 py-3 mb-1 rounded-none bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[13px] font-medium text-white/90 truncate">{displayName}</p>
            <p className="text-[11px] text-white/30 truncate mt-0.5">{user?.email}</p>
            {isAdmin(user) && (
              <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-none bg-secondary/15 text-secondary/90 border border-secondary/20">
                Admin
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] text-red-400/80 hover:bg-red-500/[0.06] hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Barre mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md flex items-center px-4 gap-3">
        <Link href="/" className="text-white/40 hover:text-primary p-1">
          <ChevronLeft size={20} />
        </Link>
        <span className="text-[13px] font-semibold text-white/90">Studio</span>
        <div className="ml-auto flex gap-0.5">
          {NAV.map(({ href, icon: Icon }) => {
            const active =
              href === "/studio" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-none transition-colors touch-manipulation ${
                  active ? "text-primary bg-primary/10" : "text-white/40"
                }`}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0 bg-[#06060a]">
        <DashboardTopBar variant="studio" />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
