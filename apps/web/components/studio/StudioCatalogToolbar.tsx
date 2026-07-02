"use client";

import { Search } from "lucide-react";

const STATUS_TONES: Record<string, { active: string; dot: string }> = {
  "": {
    active: "bg-white/[0.08] text-white/90 border-white/[0.12]",
    dot: "bg-white/50",
  },
  DRAFT: {
    active: "bg-brand-purple/15 text-brand-purple border-brand-purple/30",
    dot: "bg-brand-purple",
  },
  PENDING_REVIEW: {
    active: "bg-brand-orange/15 text-brand-orange border-brand-orange/30",
    dot: "bg-brand-orange",
  },
  PUBLISHED: {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    active: "bg-red-500/15 text-red-300 border-red-400/30",
    dot: "bg-red-400",
  },
};

export interface CatalogStatusFilter {
  code: string;
  label: string;
}

interface StudioCatalogToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (code: string) => void;
  filters: readonly CatalogStatusFilter[];
  statusCounts: Record<string, number>;
}

export function StudioCatalogToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  filters,
  statusCounts,
}: StudioCatalogToolbarProps) {
  return (
    <div className="mb-6 space-y-3">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un titre, genre, tag…"
          className="h-10 w-full border border-white/[0.08] bg-white/[0.02] pl-10 pr-4 text-[13px] text-white/90 placeholder:text-white/25 transition-colors focus:border-primary/35 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto border border-white/[0.06] bg-white/[0.015] p-1">
        {filters.map(({ code, label }) => {
          const active = status === code;
          const tone = STATUS_TONES[code] ?? STATUS_TONES[""];
          const count = code ? (statusCounts[code] ?? 0) : undefined;

          return (
            <button
              key={code || "all"}
              type="button"
              onClick={() => onStatusChange(code)}
              className={`inline-flex shrink-0 items-center gap-2 border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                active
                  ? tone.active
                  : "border-transparent text-white/40 hover:bg-white/[0.03] hover:text-white/70"
              }`}
            >
              {code ? (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? tone.dot : "bg-white/20"}`}
                  aria-hidden
                />
              ) : null}
              {label}
              {count != null && count > 0 ? (
                <span
                  className={`text-[10px] tabular-nums ${active ? "opacity-80" : "text-white/25"}`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StudioCatalogSummaryProps {
  total: number;
  statusCounts: Record<string, number>;
}

export function StudioCatalogSummary({ total, statusCounts }: StudioCatalogSummaryProps) {
  const stats = [
    { label: "Total", value: total, tone: "text-white" },
    { label: "Publiés", value: statusCounts.PUBLISHED ?? 0, tone: "text-emerald-300" },
    { label: "Brouillons", value: statusCounts.DRAFT ?? 0, tone: "text-brand-purple" },
    { label: "En attente", value: statusCounts.PENDING_REVIEW ?? 0, tone: "text-brand-orange" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {stats.map(({ label, value, tone }) => (
        <div
          key={label}
          className="border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
            {label}
          </p>
          <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${tone}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
