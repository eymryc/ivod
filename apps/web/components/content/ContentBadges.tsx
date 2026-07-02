import { viewerOfferBadgeClass, viewerOfferLabel } from "@/lib/constants/monetization";

interface ContentBadgesProps {
  isExclusive?: boolean;
  visibility?: string | null;
  ppvPrice?: number | null;
  maturityCode?: string | null;
  quality?: "SD" | "HD" | "FHD" | "4K" | null;
  /** @deprecated Utiliser visibility === "PUBLIC" */
  hasAds?: boolean;
  className?: string;
}

const MATURITY_COLORS: Record<string, string> = {
  "-18": "bg-red-600 text-white",
  "-16": "bg-orange-500 text-white",
  "-12": "bg-yellow-500 text-black",
  ALL: "bg-green-600 text-white",
};

const QUALITY_LABELS: Record<string, string> = {
  FHD: "HD",
  "4K": "4K",
  HD: "HD",
};

export function ContentBadges({
  isExclusive,
  visibility,
  ppvPrice,
  maturityCode,
  quality,
  hasAds,
  className = "",
}: ContentBadgesProps) {
  const offerLabel = viewerOfferLabel(visibility, ppvPrice);
  const showPub = hasAds ?? visibility === "PUBLIC";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {isExclusive && (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-white rounded-sm tracking-wide">
          EXCLUSIF
        </span>
      )}

      {offerLabel && (
        <span
          className={`px-2 py-0.5 text-[10px] rounded-sm ${viewerOfferBadgeClass(visibility)}`}
        >
          {offerLabel}
        </span>
      )}

      {quality && QUALITY_LABELS[quality] && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-white/80 rounded-sm border border-white/20">
          {QUALITY_LABELS[quality]}
        </span>
      )}

      {showPub && visibility !== "PUBLIC" && (
        <span className="px-2 py-0.5 text-[10px] text-white/60 bg-white/5 rounded-sm border border-white/10">
          PUB
        </span>
      )}

      {maturityCode && maturityCode !== "ALL" && (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${MATURITY_COLORS[maturityCode] ?? "bg-white/10 text-white"}`}>
          {maturityCode}
        </span>
      )}
    </div>
  );
}
