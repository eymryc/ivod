"use client";

import { Trophy, Trash2 } from "lucide-react";
import { AwardTypeBadge } from "@/components/content/AwardTypeBadge";
import { awardTypeStyle } from "@/lib/utils/award-type-colors";
import type { ContentAwardView } from "@/lib/api/awards";

type Props = {
  award: ContentAwardView;
  onRemove: () => void;
  removing?: boolean;
};

export function AwardListItem({ award, onRemove, removing }: Props) {
  const style = awardTypeStyle(award.awardType?.code);
  const meta = [award.category, award.year].filter(Boolean).join(" · ");

  return (
    <li
      className={`flex overflow-hidden rounded-none border bg-white/[0.02] ring-1 ${
        award.isWinner
          ? "border-secondary/25 ring-secondary/20"
          : "border-white/[0.05] ring-white/[0.04]"
      } ${style.ring}`}
    >
      <div className={`w-1 shrink-0 ${style.stripe}`} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        {award.isWinner && <Trophy size={16} className="shrink-0 text-secondary" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-medium text-white">{award.name}</p>
            {award.awardType?.label && (
              <AwardTypeBadge code={award.awardType.code} label={award.awardType.label} />
            )}
          </div>
          {meta && <p className="mt-1 text-[11px] text-readable-muted">{meta}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 rounded-none p-2 text-readable-dim transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          aria-label="Supprimer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
