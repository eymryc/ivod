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
    <div className="ivod-cinema-toolbar" role="toolbar" aria-label="Options de lecture">
      {pipSupported && (
        <button
          type="button"
          onClick={onTogglePip}
          aria-label={isPip ? "Quitter PiP" : "Picture-in-Picture"}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 sm:rounded-xl ${
            isPip
              ? "bg-primary/20 text-primary"
              : "text-white/70 hover:bg-white/10 hover:text-white"
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
