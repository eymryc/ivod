"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";

export {
  inputCls,
  inputClsSm,
  labelCls,
  selectCls,
  textareaCls,
  IVOD_SEARCH_INPUT,
} from "@/lib/ui/cinema-field";

export function AdminPageHeader({
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
          Administration
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

export function AdminPrimaryButton({
  href,
  onClick,
  children,
  icon: Icon,
  type = "button",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  type?: "button" | "submit";
}) {
  const cls =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors shrink-0";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {Icon && <Icon size={16} />}
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function AdminKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  accent?: "primary" | "secondary" | "emerald" | "amber";
}) {
  const iconColor = {
    primary: "text-primary/70",
    secondary: "text-secondary/80",
    emerald: "text-emerald-400/80",
    amber: "text-amber-400/80",
  }[accent];

  const inner = (
    <div className="group relative rounded-none border border-white/[0.06] bg-white/[0.01] p-5 overflow-hidden hover:border-primary/15 transition-colors h-full">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-none" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-white/35 font-medium">{label}</p>
        <Icon size={16} className={`shrink-0 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-white/30 font-light">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function AdminPanel({
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

export function AdminPanelLink({ href, children }: { href: string; children: React.ReactNode }) {
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

export function AdminPills<T extends string>({
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

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-4 rounded-none bg-transparent border border-white/[0.08] text-sm text-white placeholder:text-white/25 font-light focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-colors"
    />
  );
}

export function AdminLoading({ className = "py-24" }: { className?: string }) {
  return (
    <BrandLoader fullScreen={false} size="md" tagline="Administration" className={className} />
  );
}

export function AdminEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={28} className="text-white/15 mb-4" strokeWidth={1.25} />
      <p className="text-[13px] text-white/45 font-light">{title}</p>
      {description && (
        <p className="text-[11px] text-white/25 font-light mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50 hover:text-primary hover:border-primary/25 disabled:opacity-40 transition-colors"
      >
        Précédent
      </button>
      <span className="text-[12px] text-white/35 tabular-nums">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50 hover:text-primary hover:border-primary/25 disabled:opacity-40 transition-colors"
      >
        Suivant
      </button>
    </div>
  );
}

export const CONTENT_STATUS_UI: Record<string, { label: string; dot: string; text: string }> = {
  DRAFT: { label: "Brouillon", dot: "bg-white/35", text: "text-white/45" },
  PENDING_REVIEW: { label: "En attente", dot: "bg-secondary", text: "text-secondary" },
  PUBLISHED: { label: "Publié", dot: "bg-emerald-400", text: "text-emerald-400/90" },
  REJECTED: { label: "Rejeté", dot: "bg-red-400", text: "text-red-400/90" },
};

export const ROLE_UI: Record<string, string> = {
  ADMIN: "bg-primary/15 text-primary border-primary/20",
  CREATOR: "bg-secondary/15 text-secondary border-secondary/20",
  VIEWER: "bg-white/[0.06] text-white/50 border-white/[0.08]",
};
