"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

type MediaImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

/**
 * Images catalogue (proxy /media → API → MinIO).
 * <img> natif : pas de blocage Next Image / CORP cross-origin.
 */
export function MediaImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  fill,
  width,
  height,
  priority,
}: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-white/[0.04] text-white/40 ${
          fill ? "absolute inset-0 h-full w-full" : ""
        } ${fallbackClassName}`}
        aria-hidden={!alt}
      >
        <ImageIcon size={20} strokeWidth={1.25} className="opacity-50" />
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
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`${fillClass} ${className}`.trim()}
      onError={() => setFailed(true)}
    />
  );
}
