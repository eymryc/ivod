"use client";

import Image from "next/image";
import { assetUrl } from "@/lib/utils/assets";
import type { BannerFormValues } from "@/components/admin/banners/banner-form.types";

const CTA_PREVIEW: Record<BannerFormValues["ctaStyle"], string> = {
  PRIMARY: "bg-primary text-white border-transparent",
  GHOST: "border border-white/30 bg-transparent text-white/90",
  PREMIUM: "border border-amber-400/40 bg-amber-500/15 text-amber-200",
};

interface BannerPreviewProps {
  values: BannerFormValues;
}

export function BannerPreview({ values }: BannerPreviewProps) {
  const desktop = assetUrl(values.imageObjectKey);
  const mobile = assetUrl(values.imageObjectKeyMobile);
  const image = desktop ?? mobile;

  return (
    <aside className="overflow-hidden border border-white/[0.08] bg-gradient-to-b from-primary/[0.05] to-transparent">
      <div className="border-b border-white/[0.06] bg-black/20 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
          Aperçu homepage
        </p>
        <p className="mt-0.5 text-[11px] text-white/35">Rendu approximatif du hero</p>
      </div>

      <div className="relative aspect-[21/9] min-h-[140px] bg-[#050508]">
        {image ? (
          <Image src={image} alt="" fill className="object-cover opacity-85" sizes="400px" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 via-black to-brand-magenta/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end p-4">
          {values.badgeText ? (
            <span className="mb-2 inline-flex w-fit border border-primary/40 bg-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              {values.badgeText}
            </span>
          ) : null}
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {values.title || "Titre de la bannière"}
          </p>
          {values.subtitle ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-white/55">{values.subtitle}</p>
          ) : null}
          {values.ctaLabel ? (
            <span
              className={`mt-3 inline-flex w-fit px-3 py-1.5 text-[10px] font-semibold ${CTA_PREVIEW[values.ctaStyle]}`}
            >
              {values.ctaLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/[0.06] p-4 text-[11px] text-white/40">
        <div className="flex justify-between gap-2">
          <span>Type</span>
          <span className="text-white/70">
            {values.bannerType === "CONTENT" ? "Contenu" : "Éditorial"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Position</span>
          <span className="tabular-nums text-white/70">#{values.position}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Statut</span>
          <span className={values.isActive ? "text-emerald-400/90" : "text-white/35"}>
            {values.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        {(values.targetPlanIds.length > 0 || values.countryIds.length > 0) && (
          <div className="pt-2 border-t border-white/[0.05]">
            {values.targetPlanIds.length > 0 && (
              <p className="truncate">
                Plans :{" "}
                <span className="text-amber-400/80">{values.targetPlanIds.join(", ")}</span>
              </p>
            )}
            {values.countryIds.length > 0 && (
              <p className="truncate">
                Pays : <span className="text-white/60">{values.countryIds.join(", ")}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
