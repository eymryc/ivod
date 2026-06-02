export const VIDEO_QUEUE = 'video-pipeline';

export const VIDEO_JOB_TYPES = {
  PROBE:             'PROBE',
  /** Legacy : transcodage complet en une passe (VIDEO_TWO_PHASE=false) */
  TRANSCODE:         'TRANSCODE',
  TRANSCODE_PREVIEW: 'TRANSCODE_PREVIEW',
  TRANSCODE_FULL:    'TRANSCODE_FULL',
  PACKAGE:           'PACKAGE',
  THUMBNAIL:         'THUMBNAIL',
} as const;

/** Profil unique pour la preview rapide (lecture avant fin du ladder) */
export const PREVIEW_PROFILE_NAME = '720p';

export type VideoJobType = (typeof VIDEO_JOB_TYPES)[keyof typeof VIDEO_JOB_TYPES];

// ─── Rendition ladder — adaptatif selon la résolution source ─────────────────
// Seuls les profils ≤ hauteur source sont encodés (pas d'upscale).
// scale=-2:height : largeur calculée auto pour préserver le ratio (portrait inclus).
export interface RenditionProfile {
  name:         string;
  height:       number;
  videoBitrate: number; // bps — utilisé comme maxrate
  audioBitrate: number; // bps
  crf:          number; // Constant Rate Factor (qualité visuelle, 0=lossless, 51=pire)
  codecString:  string; // pour le manifest HLS #EXT-X-STREAM-INF CODECS=
}

export const RENDITION_PROFILES: RenditionProfile[] = [
  { name: '240p',  height: 240,  videoBitrate:    400_000, audioBitrate:  64_000, crf: 30, codecString: 'avc1.42c01e,mp4a.40.2' },
  { name: '360p',  height: 360,  videoBitrate:    800_000, audioBitrate:  96_000, crf: 28, codecString: 'avc1.4d401e,mp4a.40.2' },
  { name: '480p',  height: 480,  videoBitrate:  1_500_000, audioBitrate: 128_000, crf: 26, codecString: 'avc1.4d401f,mp4a.40.2' },
  { name: '720p',  height: 720,  videoBitrate:  3_000_000, audioBitrate: 128_000, crf: 23, codecString: 'avc1.640020,mp4a.40.2' },
  { name: '1080p', height: 1080, videoBitrate:  6_000_000, audioBitrate: 192_000, crf: 21, codecString: 'avc1.640028,mp4a.40.2' },
  { name: '1440p', height: 1440, videoBitrate: 12_000_000, audioBitrate: 192_000, crf: 19, codecString: 'avc1.640032,mp4a.40.2' },
  { name: '2160p', height: 2160, videoBitrate: 25_000_000, audioBitrate: 256_000, crf: 17, codecString: 'avc1.640033,mp4a.40.2' },
];

// Résolutions autorisées : si la source fait 720p, on encode 240p+360p+480p+720p
// Marge de tolérance (%) : si source = 710px → on accepte quand même 720p
export const UPSCALE_TOLERANCE = 0.05;

// ─── Encodeur vidéo ──────────────────────────────────────────────────────────
export type VideoEncoder = 'libx264' | 'h264_nvenc' | 'h264_vaapi' | 'h264_videotoolbox';

// Presets libx264 (vitesse ↔ qualité) — dev = prod sauf VIDEO_FAST_MODE
export const X264_PRESET: Record<string, string> = {
  development: 'medium',
  test:        'faster',
  production:  'medium',
};

/** Profils réduits si VIDEO_FAST_MODE=1 (tests locaux rapides uniquement). */
export const FAST_MODE_PROFILES = ['480p', '720p'] as const;

/** Verrou BullMQ par défaut — épisodes longs (~1 h de transcodage CPU). */
const DEFAULT_JOB_LOCK_MS = 3_600_000;
const DEFAULT_JOB_LOCK_RENEW_MS = 300_000;

/**
 * Liste blanche optionnelle (VIDEO_DEV_PROFILES=480p,720p) ou mode rapide (VIDEO_FAST_MODE).
 * Sans ces variables : même ladder adaptatif qu’en production.
 */
export function resolveProfileAllowlist(): Set<string> | null {
  const raw = process.env.VIDEO_DEV_PROFILES?.trim();
  if (raw) {
    const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length > 0) return new Set(names);
  }
  if (
    process.env.VIDEO_FAST_MODE === '1' ||
    process.env.VIDEO_FAST_MODE === 'true'
  ) {
    return new Set(FAST_MODE_PROFILES);
  }
  return null;
}

/** Ladder HLS attendu pour une hauteur source (logique identique au worker). */
export function resolveProfilesForSource(sourceHeight: number): RenditionProfile[] {
  const maxHeight = sourceHeight * (1 + UPSCALE_TOLERANCE);
  let matching = RENDITION_PROFILES.filter((p) => p.height <= maxHeight);

  const allowlist = resolveProfileAllowlist();
  if (allowlist) {
    const filtered = matching.filter((p) => allowlist.has(p.name));
    if (filtered.length > 0) {
      matching = filtered;
    } else {
      matching =
        matching.length > 0 ? [matching[matching.length - 1]!] : [RENDITION_PROFILES[0]!];
    }
  }

  return matching.length > 0 ? matching : [RENDITION_PROFILES[0]!];
}

export function resolveX264Preset(nodeEnv: string): string {
  if (
    process.env.VIDEO_FAST_MODE === '1' ||
    process.env.VIDEO_FAST_MODE === 'true'
  ) {
    return 'ultrafast';
  }
  return X264_PRESET[nodeEnv] ?? X264_PRESET.production;
}

export function resolveJobLockDuration(): number {
  const parsed = parseInt(process.env.VIDEO_JOB_LOCK_MS ?? '', 10);
  if (!Number.isNaN(parsed) && parsed >= 60_000) {
    return Math.min(parsed, 7_200_000);
  }
  return DEFAULT_JOB_LOCK_MS;
}

export function resolveJobLockRenewTime(lockDuration: number): number {
  const parsed = parseInt(process.env.VIDEO_JOB_LOCK_RENEW_MS ?? '', 10);
  if (!Number.isNaN(parsed) && parsed >= 15_000) {
    return Math.min(parsed, Math.floor(lockDuration / 2));
  }
  return Math.min(DEFAULT_JOB_LOCK_RENEW_MS, Math.floor(lockDuration / 4));
}

/**
 * Nombre max d'encodages ffmpeg CPU simultanés (évite de saturer le host).
 * Défaut : 2 en dev, 2 en prod (surchargez via VIDEO_CPU_PARALLEL).
 */
export function resolveCpuParallelism(nodeEnv: string): number {
  const parsed = parseInt(process.env.VIDEO_CPU_PARALLEL ?? '', 10);
  if (!Number.isNaN(parsed) && parsed >= 1) return Math.min(parsed, 8);
  return nodeEnv === 'development' ? 2 : 2;
}

/** Par défaut : preview 720p puis ladder complète en arrière-plan */
export function isTwoPhasePipelineEnabled(): boolean {
  const v = process.env.VIDEO_TWO_PHASE?.toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
  return true;
}

/** Profil preview (720p ou le plus haut disponible sans upscale) */
export function resolvePreviewProfile(sourceHeight: number): RenditionProfile {
  const maxHeight = sourceHeight * (1 + UPSCALE_TOLERANCE);
  const preferred = RENDITION_PROFILES.find(
    (p) => p.name === PREVIEW_PROFILE_NAME && p.height <= maxHeight,
  );
  if (preferred) return preferred;
  const matching = RENDITION_PROFILES.filter((p) => p.height <= maxHeight);
  return matching.length > 0 ? matching[matching.length - 1]! : RENDITION_PROFILES[0]!;
}

export function resolveWorkerConcurrency(): number {
  const n = parseInt(process.env.VIDEO_WORKER_CONCURRENCY ?? '1', 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 4);
}

export type HlsSegmentType = 'ts' | 'fmp4';

/** HLS segment container: MPEG-TS (default) or CMAF/fMP4 */
export function resolveHlsSegmentType(): HlsSegmentType {
  const v = process.env.VIDEO_HLS_SEGMENT_TYPE?.toLowerCase().trim();
  if (v === 'fmp4' || v === 'cmaf') return 'fmp4';
  return 'ts';
}

// Durée maximale d'un segment HLS (secondes)
export const HLS_SEGMENT_DURATION = 6;

// GOP = 1 × segment : keyframe à chaque début de segment → seeking frame-accurate
export const HLS_KEYFRAME_INTERVAL_SEC = HLS_SEGMENT_DURATION;

// Nombre de thumbnails générés automatiquement
export const THUMBNAIL_COUNT = 5;

// Formats container source acceptés (extension → type MIME)
export const ACCEPTED_FORMATS: Record<string, string> = {
  mp4:  'video/mp4',
  mov:  'video/quicktime',
  mkv:  'video/x-matroska',
  avi:  'video/x-msvideo',
  webm: 'video/webm',
  ts:   'video/mp2t',
  flv:  'video/x-flv',
  m4v:  'video/x-m4v',
  wmv:  'video/x-ms-wmv',
  '3gp': 'video/3gpp',
};
