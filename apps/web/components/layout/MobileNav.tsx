"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Grid3X3,
  Heart,
  Download,
  History,
  Settings,
  Clapperboard,
  Search,
  Tv,
  MoreHorizontal,
  X,
  Sparkles,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";
import { notificationsApi } from "@/lib/api/notifications";
import { isSameNavPath, scrollToTopOnReclick } from "@/lib/navigation/scroll-to-top-on-reclick";

const PRIMARY_ITEMS = [
  { href: "/", icon: Home, label: "Accueil", elevated: true },
  { href: "/films", icon: Grid3X3, label: "Films" },
  { href: "/series", icon: Tv, label: "Séries" },
  { href: "/search", icon: Search, label: "Recherche" },
] as const;

const MORE_SHARED = [
  { href: "/web-series", icon: Clapperboard, label: "Web-séries" },
  { href: "/animation", icon: Sparkles, label: "Animation" },
] as const;

const MORE_AUTH_ONLY = [
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/favorites", icon: Heart, label: "Favoris" },
  { href: "/downloads", icon: Download, label: "Téléchargements" },
  { href: "/history", icon: History, label: "Historique" },
  { href: "/settings", icon: Settings, label: "Profil" },
] as const;

function isActivePath(pathname: string, href: string) {
  return isSameNavPath(pathname, href);
}

export function MobileNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(1, 20),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const unreadCount = useMemo(() => {
    const items =
      (notificationsData as { items?: Array<{ read?: boolean }> })?.items ?? [];
    return items.filter((n) => !n.read).length;
  }, [notificationsData]);

  const moreItems = useMemo(
    () => (isAuthenticated ? [...MORE_AUTH_ONLY, ...MORE_SHARED] : [...MORE_SHARED]),
    [isAuthenticated],
  );

  const moreActive = moreItems.some((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-[55] lg:hidden bg-black/60 backdrop-blur-[2px]"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div
          role="dialog"
          aria-label="Plus de navigation"
          className="mobile-more-enter fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[56] lg:hidden rounded-none border border-white/[0.1] bg-[#0a0f18]/98 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-caption font-semibold text-secondary-token">
              Explorer
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="flex h-9 w-9 items-center justify-center text-white/50 hover:text-white touch-manipulation"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
            {moreItems.map(({ href, icon: Icon, label }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => {
                    setMoreOpen(false);
                    if (active) scrollToTopOnReclick(e, pathname, href);
                  }}
                  className={`ivod-btn flex items-center gap-3 px-3 py-3.5 border transition-colors touch-manipulation ${
                    active
                      ? "border-brand-magenta/35 bg-brand-magenta/[0.08] text-brand-magenta"
                      : "border-transparent text-white/75 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
                  <span className="text-[13px] font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface/95 backdrop-blur-md border-t border-white/10 pb-safe"
        aria-label="Navigation principale"
      >
        <div className="flex items-end justify-around px-1 pt-1.5">
          {PRIMARY_ITEMS.map(({ href, icon: Icon, label, ...rest }) => {
            const active = isActivePath(pathname, href);
            const elevated = "elevated" in rest && rest.elevated;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  if (active) scrollToTopOnReclick(e, pathname, href);
                }}
                className={`relative flex flex-1 max-w-[5.5rem] flex-col items-center justify-center gap-0.5 px-2 transition-colors touch-manipulation ${
                  elevated ? "-mt-3 pb-2 min-h-[3.75rem]" : "py-2 min-h-[3.25rem]"
                } ${active ? "text-brand-magenta" : "text-white/50 hover:text-white/80"}`}
              >
                {elevated && (
                  <span
                    className={`absolute -top-1 flex h-12 w-12 items-center justify-center border ${
                      active
                        ? "ivod-gradient border-white/20 text-white shadow-[0_4px_20px_rgba(230,0,126,0.35)]"
                        : "bg-[#0a0f18] border-white/12 text-white/70"
                    }`}
                  >
                    <Icon size={22} strokeWidth={active ? 2.5 : 1.75} className="shrink-0" />
                  </span>
                )}
                {!elevated && (
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.5} className="shrink-0" />
                )}
                <span
                  className={`text-[10px] font-medium leading-tight text-center truncate w-full ${
                    elevated ? "mt-8" : ""
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="Plus de pages"
            aria-expanded={moreOpen}
            className={`relative flex flex-1 max-w-[5.5rem] flex-col items-center justify-center gap-0.5 px-2 py-2 transition-colors touch-manipulation min-h-[3.25rem] ${
              moreOpen || moreActive ? "text-brand-magenta" : "text-white/50 hover:text-white/80"
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={moreOpen || moreActive ? 2.5 : 1.5} />
            {isAuthenticated && unreadCount > 0 && (
              <span className="absolute top-1 right-3 flex h-4 min-w-4 items-center justify-center px-0.5 ivod-gradient text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="text-[10px] font-medium leading-tight">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
