"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type DashboardDrawerNavProps = {
  items: readonly DashboardNavItem[];
  pathname: string;
  title: string;
  badge?: React.ReactNode;
  displayName: string;
  email?: string | null;
  onLogout: () => void;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
};

function NavLinks({
  items,
  pathname,
  rootHref,
  onNavigate,
}: {
  items: readonly DashboardNavItem[];
  pathname: string;
  rootHref: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map(({ href, icon: Icon, label }) => {
        const active = href === rootHref ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] font-medium transition-colors touch-manipulation ${
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
    </>
  );
}

export function DashboardSidebarPanel({
  items,
  pathname,
  title,
  badge,
  displayName,
  email,
  onLogout,
  onNavigate,
  homeHref = "/",
  rootHref,
}: Omit<DashboardDrawerNavProps, "drawerOpen" | "onDrawerOpenChange"> & {
  onNavigate?: () => void;
  homeHref?: string;
  rootHref?: string;
}) {
  const dashboardRoot = rootHref ?? items[0]?.href ?? "/";
  return (
    <>
      <div className="shrink-0 p-5 border-b border-white/[0.06]">
        <Link
          href={homeHref}
          onClick={onNavigate}
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
          {badge}
        </div>
        <p className="mt-2 text-[10px] font-medium tracking-[0.18em] uppercase text-primary/60">
          {title}
        </p>
        <div className="mt-2 h-px w-8 bg-gradient-to-r from-primary to-secondary/50 rounded-full" />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavLinks
          items={items}
          pathname={pathname}
          rootHref={dashboardRoot}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <div className="px-3 py-3 mb-1 rounded-none bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[13px] font-medium text-white/90 truncate">{displayName}</p>
          {email ? (
            <p className="text-[11px] text-white/30 truncate mt-0.5">{email}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] text-red-400/80 hover:bg-red-500/[0.06] hover:text-red-400 transition-colors touch-manipulation"
        >
          <LogOut size={15} />
          Se déconnecter
        </button>
      </div>
    </>
  );
}

export function DashboardMobileHeader({
  title,
  drawerOpen,
  onDrawerOpenChange,
}: {
  title: string;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md flex items-center px-4 gap-3">
      <button
        type="button"
        onClick={() => onDrawerOpenChange(!drawerOpen)}
        className="flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] items-center justify-center text-white/70 hover:text-white touch-manipulation"
        aria-label={drawerOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={drawerOpen}
      >
        {drawerOpen ? <X size={20} /> : <Menu size={20} strokeWidth={1.75} />}
      </button>
      <span className="text-[13px] font-semibold text-white/90 truncate">{title}</span>
    </div>
  );
}

export function DashboardDrawerOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Fermer le menu"
        className="md:hidden fixed inset-0 z-[45] bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Navigation"
        className="md:hidden fixed inset-y-0 left-0 z-[46] flex w-[min(280px,88vw)] flex-col overflow-hidden border-r border-white/[0.06] bg-[#0a0a0c] shadow-[4px_0_40px_rgba(0,0,0,0.5)]"
      >
        {children}
      </aside>
    </>
  );
}

export function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-primary/15 border border-primary/25 text-[10px] font-semibold text-primary tracking-wide">
      <ShieldCheck size={10} />
      ADMIN
    </span>
  );
}
