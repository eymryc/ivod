"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Users,
  UserCheck,
  DollarSign,
  CreditCard,
  Flag,
  Image as ImageIcon,
  BookOpen,
  ChevronLeft,
  LogOut,
  ShieldCheck,
  Scale,
  Megaphone,
  Shield,
  Tag,
  Layers,
} from "lucide-react";
import { useAuthStore, isAdmin } from "@/lib/stores/auth.store";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthHydrated } from "@/lib/hooks/useAuthHydrated";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { BrandLoader } from "@/components/ui/BrandLoader";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/contents", icon: Film, label: "Contenus" },
  { href: "/admin/moderation", icon: Flag, label: "Signalements" },
  { href: "/admin/users", icon: Users, label: "Utilisateurs" },
  { href: "/admin/creators", icon: UserCheck, label: "Créateurs" },
  { href: "/admin/banners", icon: ImageIcon, label: "Bannières" },
  { href: "/admin/rails", icon: Layers, label: "Rails" },
  { href: "/admin/campaigns", icon: Megaphone, label: "Campagnes" },
  { href: "/admin/revenue", icon: DollarSign, label: "Revenus créateurs" },
  { href: "/admin/payments", icon: CreditCard, label: "Paiements" },
  { href: "/admin/rightsholders", icon: Scale, label: "Droits" },
  { href: "/admin/categories", icon: Tag, label: "Catégories" },
  { href: "/admin/references", icon: BookOpen, label: "Référentiels" },
  { href: "/admin/security-logs", icon: Shield, label: "Sécurité" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    if (!isAdmin(user)) {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated) return <BrandLoader />;
  if (!isAuthenticated || !isAdmin(user)) return null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Administrateur";

  return (
    <div className="admin-shell flex h-svh max-h-svh overflow-hidden bg-[#06060a]">
      <aside className="hidden lg:flex h-full w-[232px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0a0a0c]">
        <div className="shrink-0 p-5 border-b border-white/[0.06]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-primary transition-colors mb-5"
          >
            <ChevronLeft size={14} />
            Retour au site
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/logo/logo_sans_fond.png"
              alt="iVOD"
              width={70}
              height={28}
              className="h-6 w-auto"
              loading="eager"
            />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-primary/15 border border-primary/25 text-[10px] font-semibold text-primary tracking-wide">
              <ShieldCheck size={10} />
              ADMIN
            </span>
          </div>
          <div className="mt-2 h-px w-8 bg-gradient-to-r from-primary to-secondary/50 rounded-full" />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
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
            <p className="text-[11px] text-white/30 truncate">{user?.email}</p>
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

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md flex items-center px-3 gap-2 overflow-x-auto">
        <Link href="/" className="text-white/40 hover:text-primary shrink-0 p-1">
          <ChevronLeft size={20} />
        </Link>
        <span className="text-[13px] font-semibold text-white/90 shrink-0">Admin</span>
        {NAV.map(({ href, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-none touch-manipulation ${
                active ? "text-primary bg-primary/10" : "text-white/40"
              }`}
            >
              <Icon size={16} />
            </Link>
          );
        })}
      </div>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0 bg-[#06060a]">
        <DashboardTopBar variant="admin" />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
