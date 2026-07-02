"use client";

import { Eye, Layers, MousePointerClick, Zap } from "lucide-react";

interface BannerListSummaryProps {
  total: number;
  active: number;
  impressions: number;
  clicks: number;
}

export function BannerListSummary({
  total,
  active,
  impressions,
  clicks,
}: BannerListSummaryProps) {
  const stats = [
    { label: "Bannières", value: total, icon: Layers, tone: "text-white" },
    { label: "Actives", value: active, icon: Zap, tone: "text-emerald-300" },
    { label: "Impressions", value: impressions.toLocaleString("fr-FR"), icon: Eye, tone: "text-white/90" },
    {
      label: "Clics",
      value: clicks.toLocaleString("fr-FR"),
      icon: MousePointerClick,
      tone: "text-primary",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="border border-white/[0.06] bg-white/[0.02] px-3 py-3 sm:px-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {label}
            </p>
            <Icon size={14} className="text-white/20" />
          </div>
          <p className={`mt-1.5 text-xl font-semibold tabular-nums tracking-tight ${tone}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
