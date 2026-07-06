"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart2,
  Calendar,
  Eye,
  Image as ImageIcon,
  MousePointerClick,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { BANNER_COUNTRIES } from "@/components/admin/banners/banner-constants";

const COUNTRY_LABELS = Object.fromEntries(
  BANNER_COUNTRIES.map((c) => [c.code, c.label]),
) as Record<string, string>;

export interface BannerListItem {
  id: string;
  title: string;
  subtitle?: string;
  bannerType: string;
  badgeText?: string;
  position: number;
  isActive: boolean;
  imageObjectKey?: string;
  imageObjectKeyMobile?: string;
  impressionCount: number;
  clickCount: number;
  targetPlanIds?: string[];
  countryIds?: string[];
  startsAt?: string;
  endsAt?: string;
}

interface BannerAdminCardProps {
  banner: BannerListItem;
  onToggle: () => void;
  onDelete: () => void;
  deletePending?: boolean;
}

function MetaChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "plan" | "country";
}) {
  const tones = {
    neutral: "border-white/[0.08] bg-white/[0.03] text-white/45",
    plan: "border-amber-500/25 bg-amber-500/[0.06] text-amber-300/90",
    country: "border-white/[0.08] bg-white/[0.02] text-white/50",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function BannerAdminCard({
  banner: b,
  onToggle,
  onDelete,
  deletePending,
}: BannerAdminCardProps) {
  const imgUrl = assetUrl(b.imageObjectKey);
  const ctr =
    b.impressionCount > 0
      ? ((b.clickCount / b.impressionCount) * 100).toFixed(1)
      : null;

  const hasTargeting =
    (b.targetPlanIds?.length ?? 0) > 0 || (b.countryIds?.length ?? 0) > 0;
  const hasSchedule = Boolean(b.startsAt || b.endsAt);

  return (
    <article className="group overflow-hidden border border-white/[0.06] bg-white/[0.015] transition-colors hover:border-primary/20 hover:bg-white/[0.02]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,280px)_1fr_auto]">
        {/* Visuel hero */}
        <div className="relative aspect-[21/9] min-h-[120px] bg-[#050508] lg:aspect-auto lg:min-h-[148px] lg:border-r lg:border-white/[0.05]">
          {imgUrl ? (
            <MediaImage
              src={imgUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 100vw, 280px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={28} className="text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent lg:hidden" />

          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            <span
              className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                b.bannerType === "CONTENT"
                  ? "bg-blue-500/90 text-white"
                  : "border border-white/20 bg-black/50 text-white/90 backdrop-blur-sm"
              }`}
            >
              {b.bannerType === "CONTENT" ? "Contenu" : "Éditorial"}
            </span>
            {b.badgeText ? (
              <span className="bg-primary/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                {b.badgeText}
              </span>
            ) : null}
          </div>

          <span className="absolute top-2.5 right-2.5 border border-white/10 bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/80 tabular-nums backdrop-blur-sm">
            #{b.position}
          </span>

          {b.imageObjectKeyMobile ? (
            <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-300 backdrop-blur-sm">
              <Smartphone size={10} />
              Mobile
            </span>
          ) : null}
        </div>

        {/* Infos */}
        <div className="flex min-w-0 flex-col justify-center gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold tracking-tight text-white/95 group-hover:text-primary transition-colors">
                {b.title}
              </h3>
              {b.subtitle ? (
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/40">
                  {b.subtitle}
                </p>
              ) : null}
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                b.isActive
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/[0.08] bg-white/[0.02] text-white/35"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${b.isActive ? "bg-emerald-400" : "bg-white/25"}`}
              />
              {b.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-[11px] text-white/50">
              <Eye size={12} className="text-primary/60" />
              <span className="tabular-nums font-medium text-white/75">
                {b.impressionCount.toLocaleString("fr-FR")}
              </span>
              <span className="text-white/25">vues</span>
            </div>
            <div className="inline-flex items-center gap-1.5 border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-[11px] text-white/50">
              <MousePointerClick size={12} className="text-secondary/70" />
              <span className="tabular-nums font-medium text-white/75">
                {b.clickCount.toLocaleString("fr-FR")}
              </span>
              <span className="text-white/25">clics</span>
            </div>
            {ctr ? (
              <div className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/[0.05] px-2.5 py-1.5 text-[11px]">
                <BarChart2 size={12} className="text-primary/70" />
                <span className="tabular-nums font-medium text-primary/90">CTR {ctr}%</span>
              </div>
            ) : null}
          </div>

          {hasTargeting ? (
            <div className="flex flex-wrap gap-1">
              {b.targetPlanIds?.map((p) => (
                <MetaChip key={p} tone="plan">
                  {p}
                </MetaChip>
              ))}
              {b.countryIds?.map((c) => (
                <MetaChip key={c} tone="country">
                  {COUNTRY_LABELS[c] ?? c}
                </MetaChip>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/25">Ciblage : tous plans · tous pays</p>
          )}

          {hasSchedule ? (
            <p className="inline-flex items-center gap-1.5 text-[11px] text-white/35">
              <Calendar size={11} className="shrink-0 text-white/25" />
              {b.startsAt ? new Date(b.startsAt).toLocaleDateString("fr-FR") : "∞"}
              <span className="text-white/20">→</span>
              {b.endsAt ? new Date(b.endsAt).toLocaleDateString("fr-FR") : "∞"}
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-row items-stretch border-t border-white/[0.05] lg:flex-col lg:border-t-0 lg:border-l lg:border-white/[0.05]">
          <button
            type="button"
            onClick={onToggle}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium transition-colors lg:flex-none lg:py-4 ${
              b.isActive
                ? "text-emerald-300/90 hover:bg-emerald-500/[0.08]"
                : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            <span
              className={`relative h-5 w-9 shrink-0 border transition-colors ${
                b.isActive
                  ? "border-emerald-400/40 bg-emerald-500/20"
                  : "border-white/15 bg-white/[0.04]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${
                  b.isActive ? "left-[18px] bg-emerald-400" : "left-0.5 bg-white/35"
                }`}
              />
            </span>
            <span className="hidden sm:inline">{b.isActive ? "Désactiver" : "Activer"}</span>
          </button>

          <Link
            href={`/admin/banners/${b.id}/edit`}
            className="flex flex-1 items-center justify-center gap-2 border-l border-white/[0.05] px-4 py-3 text-[11px] font-medium text-white/50 transition-colors hover:bg-primary/[0.08] hover:text-primary lg:flex-none lg:border-l-0 lg:border-t lg:border-white/[0.05] lg:py-4"
          >
            <Pencil size={14} />
            <span className="hidden sm:inline">Modifier</span>
          </Link>

          <button
            type="button"
            onClick={onDelete}
            disabled={deletePending}
            className="flex flex-1 items-center justify-center gap-2 border-l border-white/[0.05] px-4 py-3 text-[11px] font-medium text-white/40 transition-colors hover:bg-red-500/[0.08] hover:text-red-400 disabled:opacity-40 lg:flex-none lg:border-l-0 lg:border-t lg:border-white/[0.05] lg:py-4"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        </div>
      </div>
    </article>
  );
}
