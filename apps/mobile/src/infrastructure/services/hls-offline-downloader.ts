/**
 * Cache HLS offline — télécharge master + variant + segments, réécrit les manifests locaux.
 */

import * as FileSystem from 'expo-file-system/legacy';

export type HlsOfflineProgress = (pct: number) => void;

export interface HlsOfflineResult {
  localManifestUri: string;
  variantDir: string;
  segmentCount: number;
  totalBytes: number;
}

interface ParsedVariant {
  uri: string;
  height: number;
  bandwidth: number;
}

interface ParsedMediaPlaylist {
  initSegmentUrl?: string;
  segmentUrls: string[];
  targetDuration?: number;
}

const QUALITY_HEIGHT: Record<string, number> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
};

function resolveUrl(baseUrl: string, ref: string): string {
  const trimmed = ref.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    const origin = baseUrl.match(/^(https?:\/\/[^/]+)/)?.[1];
    return origin ? `${origin}${trimmed}` : trimmed;
  }
  const base = baseUrl.replace(/[^/]+$/, '');
  return `${base}${trimmed.replace(/^\.\//, '')}`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Échec chargement manifest (${res.status})`);
  }
  return res.text();
}

/** Parse un master HLS (#EXT-X-STREAM-INF + URI). */
export function parseMasterPlaylist(body: string, baseUrl: string): ParsedVariant[] {
  const lines = body.split(/\r?\n/);
  const variants: ParsedVariant[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;

    const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
    const height = resMatch ? parseInt(resMatch[2], 10) : 0;
    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;

    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j++;
    if (j >= lines.length) continue;

    const uri = resolveUrl(baseUrl, lines[j].trim());
    variants.push({ uri, height, bandwidth });
    i = j;
  }

  return variants;
}

/** Parse une media playlist VOD (segments + init optionnel). */
export function parseMediaPlaylist(body: string, baseUrl: string): ParsedMediaPlaylist {
  const lines = body.split(/\r?\n/);
  const segmentUrls: string[] = [];
  let initSegmentUrl: string | undefined;
  let targetDuration: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = parseInt(line.split(':')[1] ?? '6', 10);
    }
    if (line.startsWith('#EXT-X-MAP:')) {
      const uriMatch = line.match(/URI="([^"]+)"/);
      if (uriMatch) initSegmentUrl = resolveUrl(baseUrl, uriMatch[1]);
    }
    if (line.startsWith('#EXTINF')) {
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j++;
      if (j < lines.length) {
        segmentUrls.push(resolveUrl(baseUrl, lines[j].trim()));
        i = j;
      }
    }
  }

  return { initSegmentUrl, segmentUrls, targetDuration };
}

export function selectVariant(
  variants: ParsedVariant[],
  quality: string,
): ParsedVariant | null {
  if (!variants.length) return null;
  const targetH = QUALITY_HEIGHT[quality] ?? 720;
  const withHeight = variants.filter((v) => v.height > 0);
  const pool = withHeight.length ? withHeight : variants;
  const sorted = [...pool].sort((a, b) => a.height - b.height);
  const fit = sorted.filter((v) => v.height <= targetH);
  return fit.length ? fit[fit.length - 1]! : sorted[sorted.length - 1]!;
}

async function downloadToFile(url: string, dest: string): Promise<number> {
  const result = await FileSystem.downloadAsync(url, dest);
  const info = await FileSystem.getInfoAsync(result.uri);
  return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
}

async function writeText(path: string, content: string): Promise<void> {
  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
}

function buildLocalMediaPlaylist(
  segmentFiles: string[],
  targetDuration = 6,
  initFile?: string,
): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', `#EXT-X-TARGETDURATION:${targetDuration}`, '#EXT-X-MEDIA-SEQUENCE:0'];
  if (initFile) {
    lines.push(`#EXT-X-MAP:URI="${initFile}"`);
  }
  for (const file of segmentFiles) {
    lines.push(`#EXTINF:${targetDuration}.0,`, file);
  }
  lines.push('#EXT-X-ENDLIST', '');
  return lines.join('\n');
}

function buildLocalMasterPlaylist(variantRelativePath: string, variant: ParsedVariant): string {
  const res = variant.height > 0 ? `,RESOLUTION=${Math.round(variant.height * 16 / 9)}x${variant.height}` : '';
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth || 2_500_000}${res}`,
    variantRelativePath,
    '',
  ].join('\n');
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
}

/**
 * Télécharge une piste HLS complète et produit un master local jouable hors ligne.
 */
export async function downloadHlsOffline(params: {
  masterManifestUrl: string;
  quality: string;
  destDir: string;
  onProgress?: HlsOfflineProgress;
}): Promise<HlsOfflineResult> {
  const { masterManifestUrl, quality, destDir, onProgress } = params;
  const variantFolder = quality.replace(/\W/g, '') || '720p';
  const variantDir = `${destDir}${variantFolder}/`;

  await FileSystem.makeDirectoryAsync(variantDir, { intermediates: true });

  onProgress?.(8);
  const masterBody = await fetchText(masterManifestUrl);
  const variants = parseMasterPlaylist(masterBody, masterManifestUrl);

  let mediaPlaylistUrl = masterManifestUrl;
  let selectedVariant: ParsedVariant = { uri: masterManifestUrl, height: 720, bandwidth: 2_500_000 };

  if (variants.length > 0) {
    const picked = selectVariant(variants, quality);
    if (!picked) throw new Error('Aucune piste HLS compatible');
    selectedVariant = picked;
    mediaPlaylistUrl = picked.uri;
  }

  onProgress?.(12);
  const mediaBody = await fetchText(mediaPlaylistUrl);
  const media = parseMediaPlaylist(mediaBody, mediaPlaylistUrl);

  if (!media.segmentUrls.length) {
    throw new Error('Playlist HLS vide — aucun segment');
  }

  const segmentFiles: string[] = [];
  let totalBytes = 0;
  const totalItems =
    media.segmentUrls.length + (media.initSegmentUrl ? 1 : 0);
  let completed = 0;

  const bump = () => {
    completed++;
    const ratio = completed / totalItems;
    onProgress?.(12 + Math.round(ratio * 78));
  };

  let initFile: string | undefined;
  if (media.initSegmentUrl) {
    initFile = 'init.mp4';
    const bytes = await downloadToFile(media.initSegmentUrl, `${variantDir}${initFile}`);
    totalBytes += bytes;
    bump();
  }

  await runPool(media.segmentUrls, 3, async (url, index) => {
    const fileName = `seg_${String(index).padStart(5, '0')}.ts`;
    const bytes = await downloadToFile(url, `${variantDir}${fileName}`);
    totalBytes += bytes;
    segmentFiles[index] = fileName;
    bump();
  });

  const localMediaPath = `${variantFolder}/index.m3u8`;
  await writeText(
    `${variantDir}index.m3u8`,
    buildLocalMediaPlaylist(segmentFiles, media.targetDuration ?? 6, initFile),
  );

  const masterLocal = buildLocalMasterPlaylist(localMediaPath, selectedVariant);
  const masterPath = `${destDir}master.m3u8`;
  await writeText(masterPath, masterLocal);

  onProgress?.(96);

  return {
    localManifestUri: masterPath,
    variantDir,
    segmentCount: segmentFiles.length,
    totalBytes,
  };
}
