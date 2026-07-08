"use client";

import { BadgeCheck, Film, Users } from "lucide-react";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { CreatorProfileBanner } from "@/components/content/CreatorProfileBanner";
import { formatCount } from "@/lib/utils/format";

interface CreatorProfilePreviewProps {
  stageName: string;
  bio?: string;
  avatarObjectKey?: string;
  bannerObjectKey?: string;
  verified?: boolean;
  subscriberCount?: number;
  contentCount?: number;
  email?: string;
}

export function CreatorProfilePreview({
  stageName,
  bio,
  avatarObjectKey,
  bannerObjectKey,
  verified,
  subscriberCount = 0,
  contentCount = 0,
  email,
}: CreatorProfilePreviewProps) {
  const avatarUrl = assetUrl(avatarObjectKey);
  const initial = stageName?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div className="overflow-hidden border border-white/[0.08] bg-[#0a1018]/80">
      <div className="relative">
        <CreatorProfileBanner bannerObjectKey={bannerObjectKey} stageName={stageName} compact />
        <p className="absolute top-3 right-3 z-10 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Aperçu public
        </p>
      </div>

      <div className="relative px-5 pb-5 -mt-10">
        <div className="flex items-end gap-4">
          <div className="relative h-20 w-20 shrink-0 border-2 border-[#0a1018] bg-surface shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
            {avatarUrl ? (
              <MediaImage src={avatarUrl} alt="" fill className="object-cover" sizes="80px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-purple/50 to-brand-magenta/40 text-2xl font-display font-bold text-white">
                {initial}
              </div>
            )}
            {verified ? (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center border border-[#0a1018] bg-sky-500/90 text-white">
                <BadgeCheck size={14} />
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate font-display text-lg font-semibold text-white">{stageName || "Nom de scène"}</h2>
            {email ? <p className="truncate text-[11px] text-white/40 mt-0.5">{email}</p> : null}
          </div>
        </div>

        {bio?.trim() ? (
          <p className="mt-4 text-[12px] leading-relaxed text-white/55 line-clamp-3">{bio.trim()}</p>
        ) : (
          <p className="mt-4 text-[12px] italic text-white/30">Ajoutez une biographie pour présenter votre studio.</p>
        )}

        <div className="mt-4 flex gap-6 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <Users size={14} className="text-brand-magenta/80" />
            <span>{formatCount(subscriberCount)} abonnés</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <Film size={14} className="text-brand-magenta/80" />
            <span>{formatCount(contentCount)} contenus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
