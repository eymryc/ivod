"use client";

import { useState } from "react";
import {
  posterFallbackGradient,
  posterFallbackInitials,
} from "@/lib/design/poster-fallback";

type MediaImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  /**
   * icon = pictogramme
   * none = transparent (fond parent)
   * surface = fond neutre
   * poster = dégradé genre + initiales (VOD)
   */
  fallbackVariant?: "icon" | "none" | "surface" | "poster";
  /** Utilisé avec fallbackVariant="poster" */
  fallbackTitle?: string;
  fallbackGenreCode?: string | null;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

/**
 * Images MinIO proxifiées (`/media?bucket=…&key=…`).
 */
export function MediaImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  fallbackVariant = "icon",
  fallbackTitle,
  fallbackGenreCode,
  fill,
  sizes = "(max-width: 768px) 50vw, 320px",
  width,
  height,
  priority,
}: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    if (fallbackVariant === "none") {
      return fill ? (
        <div className={`absolute inset-0 h-full w-full ${fallbackClassName}`} aria-hidden />
      ) : null;
    }

    if (fallbackVariant === "poster" && fallbackTitle) {
      const gradient = posterFallbackGradient(fallbackGenreCode);
      const initials = posterFallbackInitials(fallbackTitle);
      return (
        <div
          className={`flex flex-col items-center justify-center bg-gradient-to-br ${gradient} ${
            fill ? "absolute inset-0 h-full w-full" : ""
          } ${fallbackClassName}`}
          aria-hidden={!alt}
        >
          <span className="font-display text-2xl sm:text-3xl font-bold text-white/90 tracking-tight drop-shadow-md">
            {initials}
          </span>
        </div>
      );
    }

    if (fallbackVariant === "surface" || fallbackVariant === "poster") {
      return (
        <div
          className={`bg-gradient-to-br from-brand-purple/30 to-brand-magenta/20 ${
            fill ? "absolute inset-0 h-full w-full" : ""
          } ${fallbackClassName}`}
          aria-hidden={!alt}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand-purple/25 to-brand-magenta/15 text-white/40 ${
          fill ? "absolute inset-0 h-full w-full" : ""
        } ${fallbackClassName}`}
        aria-hidden={!alt}
      >
        <span className="font-display text-lg font-semibold text-white/25">iVOD</span>
      </div>
    );
  }

  const fillClass = fill ? "absolute inset-0 h-full w-full" : "";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`${fillClass} ${className}`.trim()}
      onError={() => setFailed(true)}
    />
  );
}
