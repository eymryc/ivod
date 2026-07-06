"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Sparkles,
  Crown,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useProfileStore } from "@/lib/stores/profile.store";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthHydrated } from "@/lib/hooks/useAuthHydrated";
import { getViewerNavLinks } from "@/lib/navigation/viewer-nav";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { SearchBar } from "@/components/search/SearchBar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NAV_BAR_WIDTH } from "@/components/public/PublicShell";
import { navMatchTypeFromContentType } from "@/lib/utils/content-type";

type PlanCode = "FREE" | "BASIC" | "PREMIUM";

const PLAN_STYLES: Record<
  PlanCode,
  { label: string; badge: string; avatarBg: string; icon?: typeof Crown }
> = {
  FREE: {
    label: "FREE",
    badge: "bg-white/[0.06] text-white/55",
    avatarBg: "bg-[#3d3d4a]",
  },
  BASIC: {
    label: "BASIC",
    badge: "bg-sky-500/15 text-sky-300/90",
    avatarBg: "bg-sky-600",
  },
  PREMIUM: {
    label: "PREMIUM",
    badge: "bg-amber-500/25 text-amber-100 border-amber-400/30",
    avatarBg: "bg-brand-magenta",
    icon: Crown,
  },
};

const NAV_ACTION_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors";

function NavLinkItem({
  href,
  label,
  active,
  compact,
}: {
  href: string;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group relative px-4 py-2.5 rounded-none transition-colors duration-200
        ${compact ? "text-xs" : "text-[13px]"}
        ${active ? "ivod-nav-link--active text-white font-semibold" : "text-white/60 font-medium hover:text-white/90"}
      `}
    >
      <span className="flex items-center gap-2 tracking-normal">{label}</span>
      <span
        className={`
          absolute bottom-0 left-4 right-4 h-[2px] ivod-gradient origin-center transition-transform duration-300
          ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:opacity-40 opacity-0"}
        `}
        aria-hidden
      />
    </Link>
  );
}

type NavbarProps = {
  serverHasSession?: boolean;
};

export function Navbar({ serverHasSession = false }: NavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentType = searchParams.get("type");
  const isHome = pathname === "/";
  const authHydrated = useAuthHydrated();
  const { isAuthenticated, user: storeUser } = useAuthStore();
  const activeProfile = useProfileStore((s) => s.getActiveProfile());
  const { logout, user } = useAuth();
  const viewerNavLinks = useMemo(
    () =>
      getViewerNavLinks({
        isAuthenticated: isAuthenticated || !!storeUser,
        authHydrated,
        serverHasSession,
      }),
    [isAuthenticated, storeUser, authHydrated, serverHasSession],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const planCode = ((currentSub as { plan?: string })?.plan ?? "FREE") as PlanCode;
  const planStyle = PLAN_STYLES[planCode] ?? PLAN_STYLES.FREE;
  const PlanIcon = planStyle.icon;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  const navElevated = !isHome || scrolled || searchOpen;

  const activeNav = useMemo(() => {
    if (pathname === "/") return "HOME";
    if (pathname === "/films") return "FILM";
    if (pathname === "/series") return "SERIE";
    if (pathname === "/web-series") return "WEB_SERIE";
    if (pathname === "/pricing") return "PRICING";
    if (pathname === "/animation") return "ANIMATION";
    if (pathname === "/favorites") return "MY_LIST";
    if (pathname === "/downloads") return "DOWNLOADS";
    if (pathname === "/browse") {
      return contentType && ["FILM", "SERIE", "WEB_SERIE", "ANIMATION"].includes(contentType)
        ? contentType
        : "FILM";
    }
    if (pathname.startsWith("/content/")) {
      return navMatchTypeFromContentType(contentType);
    }
    if (pathname.startsWith("/watch/")) {
      return navMatchTypeFromContentType(contentType);
    }
    return null;
  }, [pathname, contentType]);

  const avatarLetter =
    activeProfile?.name?.[0]?.toUpperCase() ?? user?.firstName?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[box-shadow,background] duration-500 ease-out ${
        navElevated ? "nav-header-elevated" : "nav-header-top"
      }`}
    >
      <nav
        className={`
          relative transition-all duration-500 ease-out
          ${navElevated ? "h-[3.75rem] nav-bar-glass" : "h-[5rem] bg-transparent"}
        `}
      >
        <div className={`${NAV_BAR_WIDTH} h-full flex items-center gap-6 md:gap-10`}>
          <Link
            href="/"
            className="group flex items-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-magenta/50 rounded-none"
          >
            <Image
              src="/logo/logo_sans_fond.png"
              alt="iVOD"
              width={100}
              height={40}
              className={`w-auto object-contain transition-all duration-500 group-hover:opacity-95 ${
                navElevated ? "h-8" : "h-9 md:h-10"
              }`}
              loading="eager"
            />
          </Link>

          <div className="hidden lg:flex items-center flex-1 justify-center gap-0.5">
            {viewerNavLinks.map((item) => (
              <NavLinkItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={activeNav === item.matchType}
                compact={navElevated}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {isAuthenticated ? (
              <div
                className={`
                  ivod-btn flex items-stretch h-10 border bg-white/[0.04] transition-colors
                  ${menuOpen || searchOpen
                    ? "border-white/20 bg-white/[0.07]"
                    : "border-white/[0.12] hover:border-white/18 hover:bg-white/[0.06]"
                  }
                `}
              >
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`${NAV_ACTION_BTN} border-r border-white/[0.12] ${
                    searchOpen ? "bg-white/10 text-white" : ""
                  }`}
                  aria-label="Rechercher"
                  aria-expanded={searchOpen}
                >
                  {searchOpen ? <X size={18} /> : <Search size={19} strokeWidth={1.75} />}
                </button>

                <NotificationBell embedded />

                <div ref={menuRef} className="relative flex">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`
                      ivod-btn flex items-stretch h-10 min-w-0
                      hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-magenta/40
                      ${menuOpen ? "bg-white/[0.08]" : ""}
                    `}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                  >
                    <div
                      className={`
                        relative flex h-10 w-10 shrink-0 items-center justify-center
                        text-sm font-semibold text-white border-r border-white/[0.12]
                        ${planStyle.avatarBg}
                      `}
                    >
                      {avatarLetter}
                      {planCode === "PREMIUM" && (
                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center bg-amber-500 text-[#1a1206] border border-[#00050d]">
                          <Crown size={8} strokeWidth={2.5} className="fill-current" />
                        </span>
                      )}
                    </div>

                    <span
                      className={`
                        hidden md:inline-flex items-center gap-1.5 px-3 border-r border-white/[0.12]
                        text-[10px] font-bold uppercase tracking-[0.14em]
                        ${planStyle.badge}
                      `}
                    >
                      {PlanIcon && <PlanIcon size={10} strokeWidth={2.5} />}
                      {planStyle.label}
                    </span>

                    <span className="flex w-9 shrink-0 items-center justify-center text-white/45">
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+12px)] w-64 overflow-hidden rounded-none bg-[#00050d]/98 backdrop-blur-2xl border border-white/[0.08]"
                    >
                      <div className="px-4 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {activeProfile?.name ?? user?.firstName}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase ${planStyle.badge}`}
                          >
                            {PlanIcon && <PlanIcon size={9} />}
                            {planStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-white/45 truncate">{user?.email}</p>
                        {planCode === "PREMIUM" && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200/75">
                            <Sparkles size={12} />
                            Accès illimité · Sans pub
                          </p>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          href="/profiles"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.05]"
                        >
                          <User size={16} className="text-white/40" />
                          Changer de profil
                        </Link>
                        <Link
                          href="/settings"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.05]"
                        >
                          <Settings size={16} className="text-white/40" />
                          Paramètres
                        </Link>
                        {planCode !== "PREMIUM" && (
                          <Link
                            href="/settings/subscription"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-200/90 hover:bg-amber-500/10"
                          >
                            <Crown size={16} />
                            Passer Premium
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-white/[0.06] py-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/90 hover:bg-red-500/10"
                        >
                          <LogOut size={16} />
                          Se déconnecter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`ivod-btn ${NAV_ACTION_BTN} border border-white/[0.12] bg-white/[0.04] ${
                    searchOpen ? "bg-white/10 text-white border-white/20" : ""
                  }`}
                  aria-label="Rechercher"
                  aria-expanded={searchOpen}
                >
                  {searchOpen ? <X size={18} /> : <Search size={19} strokeWidth={1.75} />}
                </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/auth/login"
                  className="ivod-btn inline-flex items-center px-3 py-2 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-[13px] border border-white/[0.18] bg-white/[0.06] text-white hover:border-brand-magenta/45 hover:bg-white/[0.1] transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  className="ivod-btn ivod-btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-[13px]"
                >
                  S&apos;inscrire
                </Link>
              </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Recherche plein bandeau */}
      {searchOpen && (
        <div className="nav-bar-glass border-b border-white/[0.06] px-4 md:px-8 lg:px-12 py-5">
          <div className="max-w-3xl mx-auto w-full">
            <SearchBar onClose={() => setSearchOpen(false)} autoFocus />
          </div>
        </div>
      )}
    </header>
  );
}
