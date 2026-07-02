"use client";

import type { StoryboardFrame } from "@/lib/hooks/useStoryboard";

interface StoryboardPreviewProps {
  /** URL du sprite (avec token). */
  spriteUrl: string;
  /** Vignette à afficher (région du sprite). */
  frame: StoryboardFrame;
  /** Position horizontale du curseur dans le lecteur, en px. */
  cursorX: number;
  /** Largeur totale du lecteur, pour clamper la vignette. */
  containerWidth: number;
  /** Temps survolé, en secondes. */
  time: number;
}

/** Largeur d'affichage de la vignette (le sprite est en 160×90 natif). */
const PREVIEW_W = 168;
const SAFE_MARGIN = 12;
/** Largeur totale du sprite : 10 colonnes × 160px (cf. backend video-storyboard). */
const STORYBOARD_COLS_PX = 10 * 160;

function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const base = `${mm}:${String(r).padStart(2, "0")}`;
  return h > 0 ? `${h}:${base}` : base;
}

export function StoryboardPreview({
  spriteUrl,
  frame,
  cursorX,
  containerWidth,
  time,
}: StoryboardPreviewProps) {
  const scale = PREVIEW_W / frame.w;
  const previewH = frame.h * scale;

  // Centrer sur le curseur, puis clamper dans les bords du lecteur.
  const half = PREVIEW_W / 2;
  const left = Math.min(
    Math.max(cursorX - half, SAFE_MARGIN),
    Math.max(containerWidth - PREVIEW_W - SAFE_MARGIN, SAFE_MARGIN),
  );

  return (
    <div
      className="ivod-cinema-storyboard"
      style={{ left, width: PREVIEW_W }}
      aria-hidden
    >
      <div
        className="ivod-cinema-storyboard-frame"
        style={{
          width: PREVIEW_W,
          height: previewH,
          backgroundImage: `url("${spriteUrl}")`,
          backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
          backgroundSize: `${STORYBOARD_COLS_PX * scale}px auto`,
        }}
      />
      <span className="ivod-cinema-storyboard-time">{formatTimecode(time)}</span>
    </div>
  );
}
