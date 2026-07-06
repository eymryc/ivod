"use client";
import { useState } from "react";
import { Subtitles, Check } from "lucide-react";

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  objectKey: string;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrackId: string | null;
  onChange: (trackId: string | null) => void;
  variant?: "default" | "cinema";
}

export function SubtitleSelector({
  tracks,
  currentTrackId,
  onChange,
  variant = "default",
}: SubtitleSelectorProps) {
  const [open, setOpen] = useState(false);
  const isCinema = variant === "cinema";

  if (tracks.length === 0) return null;

  const btnClass = isCinema
    ? `ivod-btn flex h-9 w-9 items-center justify-center border transition-colors ${
        currentTrackId
          ? "border-brand-magenta/35 bg-brand-magenta/15 text-brand-magenta"
          : "border-transparent text-white/75 hover:border-white/15 hover:bg-white/10 hover:text-white"
      }`
    : `p-2 transition-colors ${
        currentTrackId ? "text-brand-magenta" : "text-white/70 hover:text-white"
      }`;

  const panelClass = isCinema
    ? "absolute bottom-full right-0 mb-2 min-w-48 overflow-hidden border border-white/10 bg-[#0c0c14]/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
    : "absolute bottom-full right-0 mb-2 min-w-44 overflow-hidden border border-white/15 bg-black/90 shadow-2xl";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Sous-titres"
        aria-expanded={open}
        className={btnClass}
      >
        <Subtitles size={isCinema ? 18 : 20} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div className={`${panelClass} z-50`}>
            <p className="border-b border-white/10 px-4 py-2.5 text-caption font-semibold text-muted-token">
              Sous-titres
            </p>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
            >
              <span className={!currentTrackId ? "font-medium text-brand-magenta" : "text-white/85"}>
                Désactivés
              </span>
              {!currentTrackId && <Check size={14} className="text-brand-magenta" />}
            </button>
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  onChange(track.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
              >
                <span
                  className={
                    track.id === currentTrackId ? "font-medium text-brand-magenta" : "text-white/85"
                  }
                >
                  {track.label}
                </span>
                {track.id === currentTrackId && <Check size={14} className="text-brand-magenta" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
