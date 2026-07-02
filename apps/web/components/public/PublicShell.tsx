import type { ReactNode } from "react";
import Link from "next/link";

export const PAGE_X = "px-4 md:px-8 lg:px-12 max-w-[1920px] mx-auto w-full";

/** Navbar + fiche contenu viewer — même grille (container Tailwind). */
export const VIEWER_SHELL_WIDTH =
  "container mx-auto w-full px-4 md:px-8 lg:px-12 xl:px-16";

export const NAV_BAR_WIDTH = VIEWER_SHELL_WIDTH;

/** Contenu centré (tarifs, fiches, settings…) */
export const PAGE_MAX = "max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-10";

/** Accueil — rails de cartes (catalogue, live, historique) */
export const HOME_RAIL = "container mx-auto w-full px-4 md:px-8 lg:px-12 xl:px-16";

/** Accueil — blocs éditoriaux (pills, tarifs, CTA) — aligné sur PAGE_MAX */
export const HOME_BLOCK = "container mx-auto w-full px-4 md:px-8 lg:px-12 xl:px-16";

export const pillActive =
  "ivod-btn ivod-btn-primary shrink-0 px-4 py-2 text-[13px] font-semibold transition-colors";
export const pillInactive =
  "ivod-btn shrink-0 px-4 py-2 text-[13px] font-medium border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:border-brand-magenta/40 hover:bg-white/[0.08] transition-colors";

export { selectClass } from "@/lib/ui/cinema-field";

/** Grilles listes viewer (favoris, recherche, historique…) */
export const VIEWER_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8";

/** Visible au toucher ; révélé au survol uniquement sur pointeur fin */
export const REVEAL_ON_HOVER =
  "opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100";

export const REVEAL_ON_HOVER_CARD =
  "opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100";

/** Rails horizontaux — espacement adaptatif */
export const RAIL_SCROLL_CLASS =
  "flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto overflow-y-visible py-3 scrollbar-none snap-x snap-mandatory -mx-1 px-1";

export function PublicPageHeader({
  kicker = "iVOD",
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text mb-2">
          {kicker}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{title}</h1>
        <div className="mt-3 ivod-line-accent w-12" />
        {subtitle && (
          <div className="mt-3 text-[13px] text-white/45 font-light">{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}

export function PublicSectionHeader({
  title,
  badge,
}: {
  title: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="ivod-line-accent w-10 shrink-0" />
      <h2 className="text-lg md:text-xl font-semibold text-white tracking-tight">{title}</h2>
      {badge}
    </div>
  );
}

export function PublicEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-28 text-center">
      <div className="w-16 h-16 rounded-none border border-white/[0.06] bg-white/[0.02] flex items-center justify-center mb-6 text-white/30">
        {icon}
      </div>
      <p className="text-lg font-semibold text-white tracking-tight">{title}</p>
      <p className="mt-2 text-[13px] text-white/45 font-light max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function FilterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-none border border-white/[0.06] bg-white/[0.02] p-4 md:p-5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] text-red-400/90 hover:text-red-300 font-medium transition-colors"
    >
      Réinitialiser
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "ivod-btn inline-flex items-center justify-center gap-2 h-10 px-5 border border-white/[0.12] bg-white/[0.04] text-[13px] text-white/80 hover:border-brand-magenta/35 hover:bg-white/[0.08] transition-colors"
      }
    >
      {children}
    </button>
  );
}

export function PrimaryLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="ivod-btn ivod-btn-primary inline-flex items-center justify-center h-10 px-5 text-[13px] font-semibold transition-colors"
    >
      {children}
    </Link>
  );
}
