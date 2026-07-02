"use client";

import { useState } from "react";
import { Clapperboard, Sparkles, Film } from "lucide-react";
import type { PromoVideo } from "@/core/entities/promo.entity";
import { PromoPlayerModal } from "./PromoPlayerModal";
import {
  buildPromoExtraGroups,
  countPromoVideos,
} from "@/lib/promo/display";
import type { PromoVideosBundle } from "@/core/entities/promo.entity";
import { formatDuration } from "@/lib/utils/format";

function PromoRowIcon({ typeCode }: { typeCode: string }) {
  if (typeCode === "TEASER") return <Sparkles size={16} className="text-brand-magenta shrink-0" />;
  if (typeCode === "CLIP" || typeCode === "MAKING_OF") return <Film size={16} className="shrink-0" />;
  return <Clapperboard size={16} className="shrink-0" />;
}

interface Props {
  contentTitle: string;
  promoVideos?: PromoVideosBundle | null;
}

/** Vidéos promo groupées sous la fiche titre (BA, teasers, extraits, coulisses). */
export function PromoExtrasSection({ contentTitle, promoVideos }: Props) {
  const [active, setActive] = useState<PromoVideo | null>(null);
  const groups = buildPromoExtraGroups(promoVideos);
  const total = countPromoVideos(promoVideos);

  if (total <= 1 || groups.length === 0) return null;

  return (
    <section className="py-8 border-b border-white/[0.06]">
      <h2 className="text-lg font-semibold text-white mb-5 tracking-tight">
        Bandes-annonces et plus
      </h2>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-3">
              {group.title}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((promo) => (
                <li key={promo.id}>
                  <button
                    type="button"
                    onClick={() => setActive(promo)}
                    className="ivod-btn w-full flex items-center gap-3 px-4 py-3 border border-white/10 bg-white/[0.04] text-left hover:border-brand-magenta/35 hover:bg-white/[0.07] transition-colors"
                  >
                    <PromoRowIcon typeCode={promo.typeCode} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-white truncate">
                        {promo.displayLabel}
                      </span>
                      {promo.durationSec ? (
                        <span className="text-xs text-white/45">
                          {formatDuration(promo.durationSec)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {active ? (
        <PromoPlayerModal
          promo={active}
          contentTitle={contentTitle}
          onClose={() => setActive(null)}
        />
      ) : null}
    </section>
  );
}
