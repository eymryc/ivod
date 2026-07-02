"use client";

import { useEffect, useMemo, useState } from "react";

/** Une vignette du sprite storyboard : région source + bornes temporelles. */
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

function parseVttTime(raw: string): number | null {
  const m = TIME_RE.exec(raw);
  if (!m) return null;
  const [, h, min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms) / 1000;
}

/**
 * Parse un WebVTT de storyboard (cues `... --> ...` + `sprite#xywh=x,y,w,h`)
 * en tableau ordonné de {@link StoryboardFrame}.
 */
export function parseStoryboardVtt(vtt: string): StoryboardFrame[] {
  const frames: StoryboardFrame[] = [];
  const lines = vtt.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("-->")) continue;

    const [startRaw, endRaw] = line.split("-->");
    const start = parseVttTime(startRaw);
    const end = parseVttTime(endRaw);
    if (start == null || end == null) continue;

    // La région #xywh est sur la (ou les) ligne(s) suivante(s).
    let payload = "";
    for (let j = i + 1; j < lines.length && lines[j].trim() !== ""; j++) {
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

export interface UseStoryboardResult {
  frames: StoryboardFrame[];
  /** Vignette correspondant à un temps (en secondes), ou null. */
  getFrameAt: (time: number) => StoryboardFrame | null;
  ready: boolean;
}

/**
 * Charge et parse un storyboard VTT, et expose un lookup O(log n) par temps.
 *
 * @param vttUrl URL du WebVTT (avec token de lecture) — null désactive le hook.
 */
export function useStoryboard(vttUrl?: string | null): UseStoryboardResult {
  const [frames, setFrames] = useState<StoryboardFrame[]>([]);

  useEffect(() => {
    if (!vttUrl) {
      setFrames([]);
      return;
    }
    let cancelled = false;
    fetch(vttUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (!cancelled) setFrames(parseStoryboardVtt(text));
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vttUrl]);

  const getFrameAt = useMemo(() => {
    if (frames.length === 0) return () => null;
    return (time: number): StoryboardFrame | null => {
      // Recherche binaire sur les bornes start.
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
    };
  }, [frames]);

  return { frames, getFrameAt, ready: frames.length > 0 };
}
