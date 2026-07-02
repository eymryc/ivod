"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { assetUrl } from "@/lib/utils/assets";
import { formatCount } from "@/lib/utils/format";
import type { CreatorAnalyticsTopContent } from "@/lib/types/creator-analytics";

const RANK_STYLES = [
  "text-primary",
  "text-white/50",
  "text-amber-500/80",
] as const;

interface StudioTopContentListProps {
  items: CreatorAnalyticsTopContent[];
}

export function StudioTopContentList({ items }: StudioTopContentListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-white/35">
        Les performances apparaîtront dès vos premières vues.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((item, index) => {
        const thumb = assetUrl(item.thumbnailObjectKey);
        const rankStyle = RANK_STYLES[index] ?? "text-white/25";

        return (
          <li key={item.id}>
            <Link
              href={`/studio/contents/${item.id}`}
              className="group flex items-center gap-3 rounded-none px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${rankStyle}`}
              >
                {index + 1}
              </span>

              <div className="relative h-12 w-8 shrink-0 overflow-hidden bg-white/[0.04] ring-1 ring-white/[0.06]">
                {thumb ? (
                  <MediaImage
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                    fallbackClassName="absolute inset-0 text-[8px] text-white/20"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-white/20">
                    —
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white/90 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {formatCount(item.viewCount)} vues
                  {item.completionRate != null && (
                    <> · {Math.round(item.completionRate * 100)}% complétion</>
                  )}
                </p>
              </div>

              <ArrowRight
                size={14}
                className="shrink-0 text-white/15 transition-colors group-hover:text-primary"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
