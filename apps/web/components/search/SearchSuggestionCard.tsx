"use client";

import { ChevronRight, User } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { assetUrl, cardCoverUrl } from "@/lib/utils/assets";
import { formatDuration } from "@/lib/utils/format";
import type { SearchSuggestion } from "@/lib/types/search-suggestion";

const TYPE_BADGE: Record<string, string> = {
  FILM: "text-brand-magenta",
  SERIE: "text-purple-300",
  WEB_SERIE: "text-pink-300",
  DOCUMENTAIRE: "text-emerald-300",
  ANIMATION: "text-amber-300",
  CREATOR: "text-brand-orange",
};

function buildMetaParts(s: SearchSuggestion): string[] {
  if (s.type === "CREATOR") {
    const parts = ["Créateur"];
    if (s.verified) parts.push("Vérifié");
    return parts;
  }

  const parts: string[] = [];
  if (s.contentTypeLabel) parts.push(s.contentTypeLabel);
  if (s.releaseYear) parts.push(String(s.releaseYear));
  if (s.duration) parts.push(formatDuration(s.duration));
  return parts;
}

type Props = {
  suggestion: SearchSuggestion;
  onSelect: () => void;
};

export function SearchSuggestionCard({ suggestion, onSelect }: Props) {
  const isCreator = suggestion.type === "CREATOR";
  const poster = isCreator
    ? assetUrl(suggestion.avatarObjectKey)
    : cardCoverUrl(suggestion);
  const meta = buildMetaParts(suggestion);
  const subtitle =
    suggestion.genres?.slice(0, 2).join(" · ") ||
    suggestion.creatorName ||
    suggestion.shortDescription;

  return (
    <button
      type="button"
      className="group w-full flex items-center gap-4 md:gap-5 px-4 md:px-5 py-3.5 md:py-4 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.06] last:border-b-0"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
    >
      <div
        className={`relative shrink-0 overflow-hidden bg-white/[0.04] border border-white/[0.1] shadow-md ${
          isCreator
            ? "h-14 w-14 md:h-16 md:w-16 rounded-full"
            : "h-[96px] w-[64px] md:h-[108px] md:w-[72px]"
        }`}
      >
        {poster ? (
          <MediaImage
            src={poster}
            alt=""
            fill
            className={isCreator ? "object-cover" : "object-contain"}
            sizes={isCreator ? "64px" : "72px"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/25">
            {isCreator ? <User size={24} /> : <span className="text-[11px] font-bold">iVOD</span>}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-base md:text-[17px] font-semibold text-white line-clamp-2 leading-snug group-hover:text-brand-magenta transition-colors">
          {suggestion.title}
        </p>
        {meta.length > 0 && (
          <p className="mt-1.5 text-[13px] md:text-sm text-white/55">
            {meta.map((part, i) => (
              <span key={part}>
                {i > 0 && <span className="text-white/25 mx-1.5">·</span>}
                <span className={i === 0 ? TYPE_BADGE[suggestion.type] ?? "text-white/55" : ""}>
                  {part}
                </span>
              </span>
            ))}
          </p>
        )}
        {subtitle && (
          <p className="mt-1 text-[13px] md:text-sm text-white/45 line-clamp-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <ChevronRight
        size={22}
        className="shrink-0 text-white/25 group-hover:text-brand-magenta/80 transition-colors mr-0.5"
      />
    </button>
  );
}
