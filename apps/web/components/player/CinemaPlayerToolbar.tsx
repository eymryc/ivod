"use client";

import { PictureInPicture2 } from "lucide-react";
import { QualitySelector } from "./QualitySelector";
import { SubtitleSelector } from "./SubtitleSelector";

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  objectKey: string;
}

interface CinemaPlayerToolbarProps {
  qualities: string[];
  currentQuality: string;
  onQualityChange: (q: string) => void;
  subtitleTracks: SubtitleTrack[];
  currentSubtitleId: string | null;
  onSubtitleChange: (id: string | null) => void;
  pipSupported: boolean;
  isPip: boolean;
  onTogglePip: () => void;
}

export function CinemaPlayerToolbar({
  qualities,
  currentQuality,
  onQualityChange,
  subtitleTracks,
  currentSubtitleId,
  onSubtitleChange,
  pipSupported,
  isPip,
  onTogglePip,
}: CinemaPlayerToolbarProps) {
  return (
    <div className="ivod-cinema-toolbar flex items-center gap-1" role="toolbar" aria-label="Options de lecture">
      {pipSupported && (
        <button
          type="button"
          onClick={onTogglePip}
          aria-label={isPip ? "Quitter PiP" : "Picture-in-Picture"}
          className={`ivod-btn flex h-9 w-9 items-center justify-center border transition-colors ${
            isPip
              ? "border-brand-magenta/35 bg-brand-magenta/15 text-brand-magenta"
              : "border-transparent text-white/70 hover:border-white/15 hover:bg-white/10 hover:text-white"
          }`}
        >
          <PictureInPicture2 size={17} />
        </button>
      )}
      {subtitleTracks.length > 0 && (
        <SubtitleSelector
          variant="cinema"
          tracks={subtitleTracks}
          currentTrackId={currentSubtitleId}
          onChange={onSubtitleChange}
        />
      )}
      <QualitySelector
        variant="cinema"
        qualities={qualities}
        current={currentQuality}
        onChange={onQualityChange}
      />
    </div>
  );
}
