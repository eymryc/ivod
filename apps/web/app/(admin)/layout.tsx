"use client";

import { useEffect, useState } from "react";
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
  Scale,
  Megaphone,
  Shield,
  Tag,
  Layers,
  Cpu,
} from "lucide-react";
import { useAuthStore, isAdmin } from "@/lib/stores/auth.store";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthHydrated } from "@/lib/hooks/useAuthHydrated";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  AdminBadge,
  DashboardDrawerOverlay,
  DashboardMobileHeader,
  DashboardSidebarPanel,
  type DashboardNavItem,
} from "@/components/dashboard/DashboardDrawerNav";

const NAV: readonly DashboardNavItem[] = [
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
  { href: "/admin/video-pipeline", icon: Cpu, label: "Pipeline vidéo" },
  { href: "/admin/references", icon: BookOpen, label: "Référentiels" },
  { href: "/admin/security-logs", icon: Shield, label: "Sécurité" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (!hydrated) return <BrandLoader />;
  if (!isAuthenticated || !isAdmin(user)) return null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Administrateur";

  const sidebarProps = {
    items: NAV,
    pathname,
    title: "Administration",
    badge: <AdminBadge />,
    displayName,
    email: user?.email,
    onLogout: logout,
    rootHref: "/admin",
  };

  return (
    <div className="admin-shell flex h-svh max-h-svh overflow-hidden bg-[#06060a]">
      <aside className="hidden md:flex h-full w-[232px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0a0a0c]">
        <DashboardSidebarPanel {...sidebarProps} />
      </aside>

      <DashboardMobileHeader
        title="Administration"
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      />

      <DashboardDrawerOverlay open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DashboardSidebarPanel
          {...sidebarProps}
          onNavigate={() => setDrawerOpen(false)}
        />
      </DashboardDrawerOverlay>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 md:pt-0 bg-[#06060a]">
        <DashboardTopBar variant="admin" />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
