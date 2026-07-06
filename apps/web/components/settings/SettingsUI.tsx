"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Shield,
  Monitor,
  CreditCard,
  Baby,
  Lock,
  RotateCcw,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

export const SETTINGS_NAV = [
  { href: "/settings", label: "Mon profil", description: "Identité et email", icon: User },
  { href: "/settings/subscription", label: "Abonnement", description: "Plan et factures", icon: CreditCard },
  { href: "/settings/refunds", label: "Remboursements", description: "Demandes et suivi", icon: RotateCcw },
  { href: "/settings/security", label: "Sécurité", description: "Mot de passe et accès", icon: Shield },
  { href: "/settings/devices", label: "Appareils", description: "Sessions connectées", icon: Monitor },
  { href: "/settings/parental", label: "Contrôle parental", description: "Profils et restrictions", icon: Baby },
  { href: "/settings/privacy", label: "Confidentialité", description: "Données et RGPD", icon: Lock },
] as const;

export { SETTINGS_INPUT_CLASS, SETTINGS_TEXTAREA_CLASS } from "@/lib/ui/cinema-field";

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSettingsRoot = pathname === "/settings";

  const handleBack = () => {
    router.push(isSettingsRoot ? "/" : "/settings");
  };

  return (
    <div className="min-h-screen page-canvas pb-safe">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 py-8 md:py-12">
        <button
          type="button"
          onClick={handleBack}
          className="ivod-btn inline-flex items-center gap-2 mb-6 md:mb-8 px-3 py-2 text-sm font-medium text-secondary-token hover:text-primary-token border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-colors group"
        >
          <ArrowLeft
            size={18}
            className="shrink-0 text-muted-token group-hover:text-brand-magenta transition-colors"
          />
          {isSettingsRoot ? "Retour à l'accueil" : "Retour"}
        </button>

        <header className="mb-8 md:mb-10">
          <p className="text-caption font-semibold text-brand-magenta mb-2">Mon compte</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-token tracking-tight">
            Paramètres
          </h1>
          <div className="mt-4 ivod-line-accent w-14" />
          <p className="mt-4 text-body text-secondary-token max-w-xl leading-relaxed">
            Gérez votre profil, votre abonnement, la sécurité et la confidentialité de votre expérience iVOD.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <aside className="lg:w-[260px] shrink-0">
            <nav className="settings-nav flex flex-col gap-2 lg:overflow-visible">
              {SETTINGS_NAV.map(({ href, label, description, icon: Icon }) => {
                const active =
                  href === "/settings" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`settings-nav-item group flex items-center gap-2.5 sm:gap-3 w-full px-3 py-2.5 sm:px-3.5 sm:py-3 border transition-all duration-200 ${
                      active
                        ? "settings-nav-item--active border-brand-magenta/35 bg-brand-magenta/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors ${
                        active
                          ? "border-brand-magenta/40 bg-brand-purple/20 text-brand-magenta"
                          : "border-white/10 bg-black/20 text-muted-token group-hover:text-secondary-token"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1 block">
                      <span
                        className={`block text-[13px] font-semibold ${
                          active ? "text-primary-token" : "text-secondary-token group-hover:text-primary-token"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="block text-[11px] text-muted-token mt-0.5 truncate">{description}</span>
                    </span>
                    <ChevronRight
                      size={16}
                      className={`shrink-0 hidden lg:block ${
                        active ? "text-brand-magenta/80" : "text-white/15 group-hover:text-white/30"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 lg:pl-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`settings-panel p-5 sm:p-6 md:p-7 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function SettingsSectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 md:mb-7">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 mb-2">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center border border-brand-magenta/25 bg-brand-purple/10 text-brand-magenta">
              <Icon size={17} strokeWidth={1.75} />
            </span>
          )}
          <h2 className="font-display text-lg md:text-xl font-semibold text-primary-token tracking-tight">
            {title}
          </h2>
        </div>
        {description && (
          <p className="text-body text-secondary-token max-w-lg leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SettingsPrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="ivod-btn ivod-btn-primary inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export function SettingsGhostButton({
  children,
  disabled,
  onClick,
  danger,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`ivod-btn inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium border transition-colors disabled:opacity-45 ${
        danger
          ? "border-red-500/35 text-red-400 hover:bg-red-500/10"
          : "border-white/15 text-secondary-token hover:border-white/25 hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsToggleRow({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description?: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <label className="settings-toggle-row flex items-start gap-4 p-4 md:p-5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 w-4 h-4 accent-[var(--color-brand-magenta)] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary-token">{title}</p>
        {description && <p className="text-xs text-muted-token mt-1 leading-relaxed">{description}</p>}
        {children}
      </div>
    </label>
  );
}

export function SettingsList({ children }: { children: ReactNode }) {
  return <div className="settings-list divide-y divide-white/[0.06]">{children}</div>;
}

export function SettingsListRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 md:px-6 py-4 hover:bg-white/[0.02] transition-colors">
      {children}
    </div>
  );
}

export function SettingsEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center gap-3">
      <span className="flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.03] text-muted-token">
        <Icon size={26} strokeWidth={1.25} />
      </span>
      <p className="text-base font-medium text-primary-token">{title}</p>
      {description && <p className="text-sm text-muted-token max-w-sm">{description}</p>}
    </div>
  );
}

export function SettingsBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const cls = {
    default: "bg-white/[0.06] text-secondary-token border-white/10",
    success: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
    warning: "bg-amber-500/12 text-amber-200 border-amber-500/25",
    danger: "bg-red-500/12 text-red-300 border-red-500/25",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold border ${cls}`}>
      {children}
    </span>
  );
}
