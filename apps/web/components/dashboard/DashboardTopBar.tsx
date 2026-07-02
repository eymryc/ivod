"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  Home,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useAuthStore, isAdmin, type AuthUser } from "@/lib/stores/auth.store";
import {
  resolveDashboardNavMeta,
  type DashboardVariant,
} from "@/lib/dashboard/nav-meta";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function formatNow(): string {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function displayName(user: AuthUser | null): string {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return full || user?.name || user?.email?.split("@")[0] || "Compte";
}

function initials(user: AuthUser | null): string {
  const name = displayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function primaryRole(user: AuthUser | null, variant: DashboardVariant): string {
  if (isAdmin(user)) return variant === "admin" ? "Admin" : "Admin";
  if (user?.roles?.includes("CREATOR")) return "Créateur";
  return user?.roles?.[0] ?? "Compte";
}

interface DashboardTopBarProps {
  variant: DashboardVariant;
}

export function DashboardTopBar({ variant }: DashboardTopBarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const meta = resolveDashboardNavMeta(variant, pathname);
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    setClock(formatNow());
    const id = setInterval(() => setClock(formatNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isAdminUser = isAdmin(user);
  const homeHref = variant === "admin" ? "/admin" : "/studio";

  return (
    <header className="dashboard-topbar sticky top-14 z-30 shrink-0 border-b border-white/[0.05] bg-[#06060a]/92 backdrop-blur-xl lg:top-0">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden
      />

      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[4rem] items-center justify-between gap-4 py-3 sm:min-h-[4.25rem]">
          {/* Gauche — fil d'Ariane + titre */}
          <div className="min-w-0 flex-1">
            <nav
              className="mb-1 flex flex-wrap items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35"
              aria-label="Fil d'Ariane"
            >
              {meta.breadcrumbs.map((crumb, i) => (
                <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight size={10} className="shrink-0 text-white/15" aria-hidden />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-primary/90 truncate max-w-[9rem]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate max-w-[10rem] text-white/55">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                {meta.title}
              </h1>
              {meta.section ? (
                <span className="hidden shrink-0 border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80 sm:inline-block">
                  {meta.section}
                </span>
              ) : null}
            </div>

            {meta.description ? (
              <p className="mt-0.5 hidden truncate text-[12px] text-white/38 sm:block max-w-xl">
                {meta.description}
              </p>
            ) : null}
          </div>

          {/* Droite — actions compactes */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {clock ? (
              <div
                className="hidden items-center gap-1.5 px-2.5 py-1.5 text-[11px] capitalize text-white/40 lg:flex"
                title={clock}
              >
                <Calendar size={12} className="shrink-0 text-primary/45" aria-hidden />
                <span className="tabular-nums">{clock}</span>
              </div>
            ) : null}

            <div
              className="flex items-center border border-white/[0.06] bg-white/[0.02]"
              role="toolbar"
              aria-label="Actions rapides"
            >
              <Link
                href="/"
                title="Retour au site"
                className="flex h-9 w-9 items-center justify-center text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80"
              >
                <Home size={15} strokeWidth={1.5} />
              </Link>

              {variant === "studio" && isAdminUser ? (
                <Link
                  href="/admin"
                  title="Espace admin"
                  className="flex h-9 w-9 items-center justify-center border-l border-white/[0.06] text-white/40 transition-colors hover:bg-secondary/10 hover:text-secondary"
                >
                  <ShieldCheck size={15} strokeWidth={1.5} />
                </Link>
              ) : null}

              <Link
                href={homeHref}
                title={variant === "admin" ? "Dashboard admin" : "Dashboard studio"}
                className="hidden h-9 items-center border-l border-white/[0.06] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/75 transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
              >
                {variant === "admin" ? "Admin" : "Studio"}
              </Link>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                title="Ouvrir le site public"
                className="flex h-9 w-9 items-center justify-center border-l border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/75"
              >
                <ExternalLink size={15} strokeWidth={1.5} />
              </a>
            </div>

            <NotificationBell />

            <div
              className="flex max-w-[11rem] items-center gap-2 border border-white/[0.06] bg-white/[0.02] py-1.5 pl-1.5 pr-2.5 sm:max-w-[13rem]"
              title={user?.email ?? undefined}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-to-br from-primary/35 to-secondary/25 text-[10px] font-bold text-white ring-1 ring-primary/20"
                aria-hidden
              >
                {initials(user)}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="truncate text-[12px] font-medium leading-tight text-white/90">
                  {displayName(user)}
                </p>
                <p className="truncate text-[10px] leading-tight text-white/35">
                  {primaryRole(user, variant)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
