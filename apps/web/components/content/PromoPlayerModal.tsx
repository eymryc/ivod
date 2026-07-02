"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { promoApi } from "@/lib/api/promo";
import type { PromoVideo } from "@/core/entities/promo.entity";
import { BrandLoaderMark } from "@/components/ui/BrandLoader";

interface PromoPlayerModalProps {
  promo: PromoVideo;
  contentTitle: string;
  onClose: () => void;
}

export function PromoPlayerModal({ promo, contentTitle, onClose }: PromoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["promo-stream", promo.id],
    queryFn: () => promoApi.getStream(promo.id),
    staleTime: 50 * 60_000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (stream?.url) {
      videoRef.current?.play().catch(() => setError("Lecture automatique bloquée par le navigateur."));
    }
  }, [stream?.url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-magenta mb-1">
              {promo.displayLabel}
            </p>
            <p className="text-sm text-white/70 font-medium">
              <span className="text-white">{contentTitle}</span>
              {promo.durationSec ? (
                <span className="text-white/45"> · {Math.ceil(promo.durationSec / 60)} min</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black border border-white/10 overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <BrandLoaderMark size="sm" showBar={false} showTagline={false} />
            </div>
          ) : stream?.url ? (
            <video
              ref={videoRef}
              src={stream.url}
              controls
              playsInline
              className="h-full w-full object-contain bg-black"
              onEnded={onClose}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50 px-6 text-center">
              {error ?? "Vidéo promotionnelle indisponible."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
