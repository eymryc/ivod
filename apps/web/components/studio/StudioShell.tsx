"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { EmptyStateIllustration } from "@/components/design/EmptyStateIllustration";

/** En-tête de page Studio (charte IVOD) */
export function StudioPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-primary/80 mb-2">
          Studio
        </p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-primary to-secondary/60 rounded-full" />
        {subtitle && (
          <p className="mt-3 text-[13px] text-readable-dim font-light">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function StudioPrimaryButton({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors shrink-0"
    >
      {Icon && <Icon size={16} />}
      {children}
    </Link>
  );
}

export function StudioKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "primary",
  featured = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  accent?: "primary" | "secondary" | "emerald";
  featured?: boolean;
}) {
  const accentStyles = {
    primary: {
      icon: "text-primary/80",
      glow: "from-primary/15",
      border: "hover:border-primary/20",
    },
    secondary: {
      icon: "text-secondary/80",
      glow: "from-secondary/15",
      border: "hover:border-secondary/20",
    },
    emerald: {
      icon: "text-emerald-400/80",
      glow: "from-emerald-500/15",
      border: "hover:border-emerald-400/20",
    },
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden border border-white/[0.06] bg-white/[0.02] transition-colors ${accentStyles.border} ${
        featured ? "p-6 sm:p-7" : "p-4 sm:p-5"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentStyles.glow} to-transparent opacity-60`}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            {label}
          </p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/[0.06] bg-black/20">
            <Icon size={15} className={accentStyles.icon} strokeWidth={1.5} />
          </div>
        </div>
        <p
          className={`mt-3 font-semibold tracking-tight text-white tabular-nums ${
            featured ? "text-3xl sm:text-4xl" : "text-2xl"
          }`}
        >
          {value}
        </p>
        {sub && <p className="mt-1.5 text-[11px] font-light text-white/35">{sub}</p>}
      </div>
    </div>
  );
}

export function StudioPanel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-none border border-white/[0.06] bg-white/[0.01] ring-1 ring-primary/[0.04] overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-white/[0.05] bg-primary/[0.02]">
        <span className="text-[11px] uppercase tracking-[0.14em] text-primary/50 font-medium">
          {title}
        </span>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StudioPanelLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
    >
      {children}
      <ArrowRight size={12} />
    </Link>
  );
}

export function StudioPeriodPills<T extends string>({
  options = [],
  value,
  onChange,
}: {
  options?: readonly { code: T; label: string }[];
  value: T;
  onChange: (code: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1 rounded-none border border-white/[0.06] bg-white/[0.02]">
      {(options ?? []).map((p) => (
        <button
          key={p.code}
          type="button"
          onClick={() => onChange(p.code)}
          className={`px-3.5 py-1.5 rounded-none text-[12px] font-medium transition-colors ${
            value === p.code
              ? "bg-primary/15 text-primary"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function StudioLoading({ className = "py-24" }: { className?: string }) {
  return (
    <BrandLoader
      fullScreen={false}
      size="md"
      tagline="Studio"
      className={className}
    />
  );
}

export function StudioEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <EmptyStateIllustration variant="default" className="h-20 w-20" />
      <p className="text-[13px] text-white/45 font-light mt-1">{title}</p>
      {description && (
        <p className="text-[11px] text-white/25 font-light mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
