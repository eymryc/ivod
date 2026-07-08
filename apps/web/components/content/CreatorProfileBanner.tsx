"use client";

import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import {
  CREATOR_PROFILE_BANNER_CLASS,
  CREATOR_PROFILE_BANNER_IMAGE_CLASS,
} from "@/lib/constants/hero-layout";

interface CreatorProfileBannerProps {
  bannerObjectKey?: string | null;
  stageName?: string;
  priority?: boolean;
  /** Aperçu studio (plus compact) */
  compact?: boolean;
  className?: string;
}

export function CreatorProfileBanner({
  bannerObjectKey,
  stageName,
  priority,
  compact,
  className = "",
}: CreatorProfileBannerProps) {
  const bannerUrl = assetUrl(bannerObjectKey);

  return (
    <div
      className={`${compact ? "relative h-36 sm:h-40 overflow-hidden bg-[#06060a]" : CREATOR_PROFILE_BANNER_CLASS} ${className}`}
    >
      {bannerUrl ? (
        <MediaImage
          src={bannerUrl}
          alt={stageName ? `Bannière ${stageName}` : ""}
          fill
          className={CREATOR_PROFILE_BANNER_IMAGE_CLASS}
          sizes={compact ? "400px" : "100vw"}
          priority={priority}
        />
      ) : (
        <>
          <div className="absolute inset-0 ivod-gradient opacity-[0.22]" />
          <div className="pointer-events-none absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-brand-magenta/[0.16] blur-[120px]" />
          <div className="pointer-events-none absolute -top-10 right-1/4 h-72 w-72 rounded-full bg-brand-purple/[0.18] blur-[120px]" />
        </>
      )}
      {/* Fondu bas — transition vers l’en-tête profil / avatar */}
      <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-background via-background/55 to-transparent" />
      {/* Léger fondu haut — lisibilité sous la navbar */}
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-background/70 to-transparent sm:h-16" />
    </div>
  );
}
