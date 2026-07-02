/**
 * Storyboard seek preview — parse VTT + calcul de tuile (parité web useStoryboard).
 */

export interface StoryboardFrame {
  start: number;
  end: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const TIME_RE = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
const XYWH_RE = /#xywh=(\d+),(\d+),(\d+),(\d+)/;

export const STORYBOARD_TILE_WIDTH = 160;
export const STORYBOARD_TILE_HEIGHT = 90;
export const STORYBOARD_COLS = 10;
export const STORYBOARD_INTERVAL_SEC = 6;

function parseVttTime(raw: string): number | null {
  const m = TIME_RE.exec(raw);
  if (!m) return null;
  const [, h, min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms) / 1000;
}

export function parseStoryboardVtt(vtt: string): StoryboardFrame[] {
  const frames: StoryboardFrame[] = [];
  const lines = vtt.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('-->')) continue;

    const [startRaw, endRaw] = line.split('-->');
    const start = parseVttTime(startRaw);
    const end = parseVttTime(endRaw);
    if (start == null || end == null) continue;

    let payload = '';
    for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) {
      payload += lines[j];
    }
    const xywh = XYWH_RE.exec(payload);
    if (!xywh) continue;

    frames.push({
      start,
      end,
      x: Number(xywh[1]),
      y: Number(xywh[2]),
      w: Number(xywh[3]),
      h: Number(xywh[4]),
    });
  }

  return frames.sort((a, b) => a.start - b.start);
}

export function getFrameAtTime(frames: StoryboardFrame[], time: number): StoryboardFrame | null {
  if (frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].start <= time) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return frames[best] ?? null;
}

export function resolveStoryboardTileCount(durationSec: number): number {
  const d = Math.max(1, Math.floor(durationSec));
  return Math.min(100, Math.max(1, Math.ceil(d / STORYBOARD_INTERVAL_SEC)));
}

export function resolveStoryboardFrameAt(seconds: number, durationSec?: number | null): ResumePreviewFrameLike {
  const d = Math.max(1, Math.floor(durationSec ?? Math.max(seconds + STORYBOARD_INTERVAL_SEC, 60)));
  const tileCount = resolveStoryboardTileCount(d);
  const index = Math.min(
    tileCount - 1,
    Math.max(0, Math.floor(Math.max(0, seconds) / STORYBOARD_INTERVAL_SEC)),
  );
  const col = index % STORYBOARD_COLS;
  const row = Math.floor(index / STORYBOARD_COLS);
  const rows = Math.ceil(tileCount / STORYBOARD_COLS);
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

type ResumePreviewFrameLike = {
  x: number;
  y: number;
  w: number;
  h: number;
  spriteWidth: number;
  spriteHeight: number;
  tileIndex: number;
};
