import {
  STORYBOARD_COLS,
  STORYBOARD_INTERVAL_SEC,
  STORYBOARD_TILE_HEIGHT,
  STORYBOARD_TILE_WIDTH,
  resolveStoryboardTileCount,
  resolveStoryboardRows,
} from '../../modules/videos/video-storyboard';

export type ResumePreviewFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  spriteWidth: number;
  spriteHeight: number;
  tileIndex: number;
};

export type ResumePreviewDto = {
  spriteObjectKey: string;
  watchedSeconds: number;
  frame: ResumePreviewFrame;
};

/** Région du sprite storyboard correspondant à un instant de lecture. */
export function resolveStoryboardFrameAt(
  seconds: number,
  durationSec?: number | null,
): ResumePreviewFrame {
  const d = Math.max(1, Math.floor(durationSec ?? Math.max(seconds + STORYBOARD_INTERVAL_SEC, 60)));
  const tileCount = resolveStoryboardTileCount(d);
  const index = Math.min(
    tileCount - 1,
    Math.max(0, Math.floor(Math.max(0, seconds) / STORYBOARD_INTERVAL_SEC)),
  );
  const col = index % STORYBOARD_COLS;
  const row = Math.floor(index / STORYBOARD_COLS);
  const rows = resolveStoryboardRows(tileCount);
  return {
    x: col * STORYBOARD_TILE_WIDTH,
    y: row * STORYBOARD_TILE_HEIGHT,
    w: STORYBOARD_TILE_WIDTH,
    h: STORYBOARD_TILE_HEIGHT,
    spriteWidth: STORYBOARD_COLS * STORYBOARD_TILE_WIDTH,
    spriteHeight: rows * STORYBOARD_TILE_HEIGHT,
    tileIndex: index,
  };
}

export function buildResumePreview(
  watchedSeconds: number,
  spriteObjectKey: string | null | undefined,
  durationSec?: number | null,
): ResumePreviewDto | null {
  if (!spriteObjectKey || watchedSeconds <= 0) return null;
  return {
    spriteObjectKey,
    watchedSeconds: Math.floor(watchedSeconds),
    frame: resolveStoryboardFrameAt(watchedSeconds, durationSec),
  };
}
