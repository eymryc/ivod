"use client";

import { useState } from "react";
import { Clapperboard, Sparkles, Film } from "lucide-react";
import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";
import { buildPromoActions } from "@/lib/promo/display";
import { PromoPlayerModal } from "./PromoPlayerModal";

function PromoIcon({ typeCode }: { typeCode: string }) {
  if (typeCode === "TEASER") return <Sparkles size={16} className="shrink-0" />;
  if (typeCode === "CLIP" || typeCode === "MAKING_OF") return <Film size={16} className="shrink-0" />;
  return <Clapperboard size={16} className="shrink-0" />;
}

interface PromoVideoBarProps {
  contentTitle: string;
  promoVideos?: PromoVideosBundle | null;
  comingSoon?: boolean;
  className?: string;
}

/** Rangée de boutons Teaser / BA / Extras — lecture via API promo-stream. */
export function PromoVideoBar({
  contentTitle,
  promoVideos,
  comingSoon,
  className = "",
}: PromoVideoBarProps) {
  const [active, setActive] = useState<PromoVideo | null>(null);
  const actions = buildPromoActions(promoVideos, { comingSoon });

  if (!actions.length) return null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {actions.map((promo) => (
          <button
            key={promo.id}
            type="button"
            onClick={() => setActive(promo)}
            className="ivod-btn inline-flex items-center gap-2 h-10 px-4 border border-white/15 bg-white/[0.06] text-sm font-medium text-white/90 hover:border-brand-magenta/45 hover:bg-white/[0.1] transition-colors"
          >
            <PromoIcon typeCode={promo.typeCode} />
            {promo.displayLabel}
          </button>
        ))}
      </div>

      {active ? (
        <PromoPlayerModal
          promo={active}
          contentTitle={contentTitle}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}
