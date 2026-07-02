/**
 * Encodage ladder HLS en une passe ffmpeg (filter_complex).
 * Un seul décodage source → plusieurs résolutions (style CDN / Mux).
 *
 * Audio : AAC (mp4a.40.2) — compatibilité HLS .ts universelle (Safari, TV, mobile).
 * Opus n’est pas utilisé ici : support HLS fMP4/CMAF partiel, refactor lecteur séparé.
 */
import * as path from 'path';
import {
  HLS_SEGMENT_DURATION,
  HLS_KEYFRAME_INTERVAL_SEC,
  resolveHlsSegmentType,
  resolveFFmpegThreads,
  type RenditionProfile,
} from './video-pipeline.constants';

export interface LadderSourceMeta {
  displayWidth: number;
  displayHeight: number;
  frameRate: number;
  durationSec: number;
  isHDR: boolean;
  audioChannels: number;
}

export interface LadderFilterGraph {
  filterComplex: string;
  videoLabels: string[];
  audioLabels: string[] | null;
}

/** Loudness normalisation unique (EBU R128) — même cible que les encodeurs broadcast / OTT. */
export const AUDIO_LOUDNORM_FILTER =
  'aresample=48000,loudnorm=I=-16:LRA=11:TP=-1.5';

export function isSinglePassLadderEnabled(): boolean {
  const v = process.env.VIDEO_SINGLE_PASS_LADDER?.toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return true;
}

export function buildScaleFormatChain(targetHeight: number, isHDR: boolean): string {
  const scale = `scale=-2:${targetHeight}`;
  if (isHDR) {
    return (
      `${scale},zscale=transfer=linear:npl=100,format=gbrpf32le,` +
      `zscale=primaries=bt709,tonemap=tonemap=hable:desat=0,` +
      `zscale=transfer=bt709:matrix=bt709:range=tv,format=yuv420p`
    );
  }
  return `${scale},format=yuv420p`;
}

/**
 * Graphe filter_complex : split vidéo + loudnorm audio unique (asplit).
 */
export function buildLadderFilterGraph(
  profiles: RenditionProfile[],
  meta: LadderSourceMeta,
): LadderFilterGraph {
  const n = profiles.length;
  if (n < 1) {
    throw new Error('buildLadderFilterGraph: au moins un profil requis');
  }

  const videoLabels: string[] = [];
  const parts: string[] = [];

  if (n === 1) {
    parts.push(`[0:v]${buildScaleFormatChain(profiles[0]!.height, meta.isHDR)}[vout0]`);
    videoLabels.push('vout0');
  } else {
    const splitOut = profiles.map((_, i) => `[vs${i}]`).join('');
    parts.push(`[0:v]split=${n}${splitOut}`);
    for (let i = 0; i < n; i++) {
      const label = `vout${i}`;
      parts.push(
        `;[vs${i}]${buildScaleFormatChain(profiles[i]!.height, meta.isHDR)}[${label}]`,
      );
      videoLabels.push(label);
    }
  }

  let audioLabels: string[] | null = null;
  if (meta.audioChannels > 0) {
    audioLabels = profiles.map((_, i) => `aout${i}`);
    if (n === 1) {
      parts.push(`;[0:a]${AUDIO_LOUDNORM_FILTER}[aout0]`);
    } else {
      const asplitOut = profiles.map((_, i) => `[as${i}]`).join('');
      parts.push(`;[0:a]${AUDIO_LOUDNORM_FILTER},asplit=${n}${asplitOut}`);
      for (let i = 0; i < n; i++) {
        parts.push(`;[as${i}]anull[aout${i}]`);
      }
    }
  }

  return {
    filterComplex: parts.join(''),
    videoLabels,
    audioLabels,
  };
}

export function computeRenditionWidth(
  meta: LadderSourceMeta,
  profileHeight: number,
): number {
  if (!meta.displayHeight || !meta.displayWidth) return profileHeight * 16 / 9;
  return Math.round((meta.displayWidth / meta.displayHeight) * profileHeight / 2) * 2;
}

export function computeGopSize(frameRate: number): number {
  return Math.round(frameRate * HLS_KEYFRAME_INTERVAL_SEC) || 48;
}

export interface BuildSinglePassArgsInput {
  sourceFile: string;
  tmpDir: string;
  profiles: RenditionProfile[];
  meta: LadderSourceMeta;
  /** Arguments encodeur libx264 par profil (preset, crf, maxrate, …) */
  videoEncoderArgs: (profile: RenditionProfile) => string[];
}

/**
 * Arguments ffmpeg complets : -filter_complex + N sorties HLS.
 */
export function buildSinglePassFfmpegArgs(input: BuildSinglePassArgsInput): string[] {
  const { sourceFile, tmpDir, profiles, meta, videoEncoderArgs } = input;
  const graph = buildLadderFilterGraph(profiles, meta);
  const gopSize = computeGopSize(meta.frameRate);
  const hasAudio = meta.audioChannels > 0;
  const segmentType = resolveHlsSegmentType();

  const args: string[] = [
    '-y',
    '-v',
    'error',
    '-hide_banner',
    '-threads',
    String(resolveFFmpegThreads()),
    '-max_muxing_queue_size',
    '1024',
    '-i',
    sourceFile,
    '-filter_complex',
    graph.filterComplex,
  ];

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i]!;
    const renditionDir = path.join(tmpDir, profile.name);
    const segmentPat = path.join(
      renditionDir,
      segmentType === 'fmp4' ? 'seg%05d.m4s' : 'seg%05d.ts',
    );
    const initFile = path.join(renditionDir, 'init.mp4');
    const outputM3u8 = path.join(renditionDir, 'index.m3u8');
    const vLabel = graph.videoLabels[i]!;

    args.push(
      '-map',
      `[${vLabel}]`,
      '-c:v',
      'libx264',
      ...videoEncoderArgs(profile),
      '-g',
      String(gopSize),
      '-keyint_min',
      String(gopSize),
      '-sc_threshold',
      '0',
    );

    if (hasAudio && graph.audioLabels) {
      args.push(
        '-map',
        `[${graph.audioLabels[i]}]`,
        '-c:a',
        'aac',
        '-b:a',
        String(profile.audioBitrate),
        '-ac',
        '2',
      );
    } else {
      args.push('-an');
    }

    args.push(
      '-f',
      'hls',
      '-hls_time',
      String(HLS_SEGMENT_DURATION),
      '-hls_playlist_type',
      'vod',
      ...(segmentType === 'fmp4'
        ? ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', initFile]
        : []),
      '-hls_segment_filename',
      segmentPat,
      '-hls_flags',
      'independent_segments',
      outputM3u8,
    );
  }

  return args;
}
