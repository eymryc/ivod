/**
 * Storyboard seek preview — sprite JPEG + WebVTT (références #xywh).
 * Compatible Video.js / lecteurs HTML5 avec thumbnails track.
 */
import * as path from 'path';

export const STORYBOARD_TILE_WIDTH = 160;
export const STORYBOARD_TILE_HEIGHT = 90;
export const STORYBOARD_COLS = 10;
/** Intervalle entre vignettes (secondes) — aligné sur la granularité de seek. */
export const STORYBOARD_INTERVAL_SEC = 6;
export const STORYBOARD_MAX_TILES = 100;

export function resolveStoryboardTileCount(durationSec: number): number {
  const d = Math.max(1, Math.floor(durationSec));
  const count = Math.ceil(d / STORYBOARD_INTERVAL_SEC);
  return Math.min(STORYBOARD_MAX_TILES, Math.max(1, count));
}

export function resolveStoryboardRows(tileCount: number): number {
  return Math.ceil(tileCount / STORYBOARD_COLS);
}

/** Filtre ffmpeg : fps → scale/pad → tile. */
export function buildStoryboardFfmpegFilter(tileCount: number): string {
  const rows = resolveStoryboardRows(tileCount);
  const fps = 1 / STORYBOARD_INTERVAL_SEC;
  return (
    `fps=${fps},` +
    `scale=${STORYBOARD_TILE_WIDTH}:${STORYBOARD_TILE_HEIGHT}:force_original_aspect_ratio=decrease,` +
    `pad=${STORYBOARD_TILE_WIDTH}:${STORYBOARD_TILE_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,` +
    `tile=${STORYBOARD_COLS}x${rows}`
  );
}

/** Nom de fichier sprite dans le VTT (chemin relatif au manifeste / API). */
export function storyboardSpriteFileName(): string {
  return 'sprite.jpg';
}

export function storyboardMinioKeys(assetId: string): {
  spriteKey: string;
  vttKey: string;
} {
  const base = `storyboards/${assetId}`;
  return {
    spriteKey: `${base}/sprite.jpg`,
    vttKey: `${base}/thumbnails.vtt`,
  };
}

export function buildStoryboardVtt(
  durationSec: number,
  spriteFileName: string = storyboardSpriteFileName(),
): string {
  const tileCount = resolveStoryboardTileCount(durationSec);
  const lines: string[] = ['WEBVTT', ''];

  for (let i = 0; i < tileCount; i++) {
    const start = i * STORYBOARD_INTERVAL_SEC;
    const end = Math.min(durationSec, start + STORYBOARD_INTERVAL_SEC);
    const col = i % STORYBOARD_COLS;
    const row = Math.floor(i / STORYBOARD_COLS);
    const x = col * STORYBOARD_TILE_WIDTH;
    const y = row * STORYBOARD_TILE_HEIGHT;

    lines.push(
      `${formatVttTime(start)} --> ${formatVttTime(end)}`,
      `${spriteFileName}#xywh=${x},${y},${STORYBOARD_TILE_WIDTH},${STORYBOARD_TILE_HEIGHT}`,
      '',
    );
  }

  return lines.join('\n');
}

function formatVttTime(sec: number): string {
  const totalMs = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function storyboardSpriteLocalPath(tmpDir: string): string {
  return path.join(tmpDir, storyboardSpriteFileName());
}
