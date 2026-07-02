"use client";
import { useState } from "react";
import { Settings, Check } from "lucide-react";

interface QualitySelectorProps {
  qualities: string[];
  current: string;
  onChange: (quality: string) => void;
  variant?: "default" | "cinema";
}

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  "360p": "360p",
  "480p": "480p SD",
  "720p": "720p HD",
  "1080p": "1080p FHD",
};

export function QualitySelector({
  qualities,
  current,
  onChange,
  variant = "default",
}: QualitySelectorProps) {
  const [open, setOpen] = useState(false);
  const isCinema = variant === "cinema";

  const btnClass = isCinema
    ? "flex h-9 w-9 items-center justify-center rounded-xl text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    : "p-2 text-white/70 transition-colors hover:text-white";

  const panelClass = isCinema
    ? "absolute bottom-full right-0 mb-2 min-w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14]/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
    : "absolute bottom-full right-0 mb-2 min-w-44 overflow-hidden rounded-xl border border-white/15 bg-black/90 shadow-2xl";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Qualité vidéo"
        aria-expanded={open}
        className={btnClass}
      >
        <Settings size={isCinema ? 18 : 20} />
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
            <p className="border-b border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Qualité
            </p>
            {qualities.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  onChange(q);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
              >
                <span className={q === current ? "font-medium text-primary" : "text-white/85"}>
                  {QUALITY_LABELS[q] ?? q}
                </span>
                {q === current && <Check size={14} className="text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
