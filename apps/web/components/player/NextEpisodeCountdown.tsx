"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SkipForward, X } from "lucide-react";

interface NextEpisodeCountdownProps {
  contentId: string;
  nextEpisodeId: string;
  nextEpisodeTitle: string;
  nextEpisodeNumber: number;
  onDismiss: () => void;
}

export function NextEpisodeCountdown({
  contentId,
  nextEpisodeId,
  nextEpisodeTitle,
  nextEpisodeNumber,
  onDismiss,
}: NextEpisodeCountdownProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          router.push(`/watch/${contentId}?ep=${nextEpisodeId}`);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [contentId, nextEpisodeId, router]);

  const progress = ((5 - remaining) / 5) * 100;

  return (
    <div className="absolute bottom-20 right-4 z-30 w-[min(100%,18rem)] overflow-hidden bg-black/80 backdrop-blur-md sm:right-6">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background:
            "linear-gradient(90deg, #7c3aed, #e6007e, #f97316, #eab308)",
          width: `${progress}%`,
          transition: "width 1s linear",
        }}
        aria-hidden
      />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-brand-magenta">
              Épisode suivant
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
              Ép. {nextEpisodeNumber}
              {nextEpisodeTitle ? ` — ${nextEpisodeTitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="ivod-btn shrink-0 p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Annuler"
          >
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/watch/${contentId}?ep=${nextEpisodeId}`)}
          className="ivod-btn ivod-btn-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
        >
          <SkipForward size={16} />
          Lancer maintenant
          <span className="ml-auto tabular-nums text-xs text-white/70">{remaining}s</span>
        </button>
      </div>
    </div>
  );
}
