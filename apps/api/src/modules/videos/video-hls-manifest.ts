export interface HlsRenditionRow {
  videoBitrate: number;
  audioBitrate: number;
  width: number;
  height: number;
  /** Fréquence d'images source (ex: 23.976, 25, 29.97, 30, 60) */
  frameRate?: number;
  codecs: string | null;
  playlistPath: string;
}

export interface HlsSubtitleRow {
  languageCode: string;
  label: string;
  /** Chemin objet MinIO (relatif au bucket vidéos) */
  objectKey: string;
  isDefault?: boolean;
}

export interface HlsAudioRow {
  languageCode: string;
  label: string;
  /** Playlist audio-only (ou URI compatible) */
  playlistPath: string;
  isDefault?: boolean;
}

export type HlsMasterSegmentType = 'ts' | 'fmp4';

const SUBTITLE_GROUP = 'subs';
const AUDIO_GROUP = 'aud';

function variantRelativePath(playlistPath: string): string {
  return playlistPath.includes('/')
    ? playlistPath.split('/').slice(-2).join('/')
    : playlistPath;
}

/** URI dans le master = chemin objet MinIO (réécrit en URL proxy à la lecture) */
function subtitleUri(objectKey: string): string {
  return objectKey.replace(/\/+/g, '/');
}

/**
 * Version HLS minimale selon le type de segment :
 * - MPEG-TS → v3 (floating-point EXTINF)
 * - fMP4/CMAF → v7 (requis par la spec Apple HLS pour les segments fMP4)
 *
 * Référence : Apple HLS spec §4 EXT-X-VERSION
 */
function resolveHlsVersion(segmentType: HlsMasterSegmentType): number {
  return segmentType === 'fmp4' ? 7 : 3;
}

/**
 * Master HLS VOD — génère le playlist maître conforme à la spec Apple HLS.
 *
 * - v3 pour MPEG-TS (compatibilité maximale)
 * - v7 pour fMP4/CMAF (requis par la spec)
 * - EXT-X-INDEPENDENT-SEGMENTS : indique que chaque segment peut être décodé
 *   indépendamment (obligatoire pour le seeking précis et requis en v6+)
 * - FRAME-RATE : attribut recommandé par Apple pour les variants > 30 fps
 */
export function buildMasterPlaylistBody(
  renditions: HlsRenditionRow[],
  subtitles: HlsSubtitleRow[] = [],
  audioTracks: HlsAudioRow[] = [],
  segmentType: HlsMasterSegmentType = 'ts',
): string {
  const version = resolveHlsVersion(segmentType);
  const lines: string[] = [
    '#EXTM3U',
    `#EXT-X-VERSION:${version}`,
    // Chaque segment est décodable indépendamment → seeking précis côté client
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '',
  ];
  const hasSubs = subtitles.length > 0;
  const hasAudio = audioTracks.length > 0;

  if (hasAudio) {
    for (const at of audioTracks) {
      const name = (at.label || at.languageCode).replace(/"/g, "'");
      const def = at.isDefault ? 'YES' : 'NO';
      lines.push(
        `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="${AUDIO_GROUP}",` +
          `NAME="${name}",LANGUAGE="${at.languageCode}",DEFAULT=${def},AUTOSELECT=YES,` +
          `URI="${at.playlistPath}"`,
      );
    }
    lines.push('');
  }

  if (hasSubs) {
    for (const st of subtitles) {
      const name = (st.label || st.languageCode).replace(/"/g, "'");
      const def = st.isDefault ? 'YES' : 'NO';
      lines.push(
        `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="${SUBTITLE_GROUP}",` +
          `NAME="${name}",LANGUAGE="${st.languageCode}",DEFAULT=${def},AUTOSELECT=YES,` +
          `FORCED=NO,URI="${subtitleUri(st.objectKey)}"`,
      );
    }
    lines.push('');
  }

  for (const r of renditions) {
    const bandwidth = r.videoBitrate + r.audioBitrate;
    const avgBandwidth = Math.round(bandwidth * 0.85);
    const resolution = `${r.width}x${r.height}`;
    const codecs = r.codecs ?? 'avc1.640020,mp4a.40.2';
    const subsAttr = hasSubs ? `,SUBTITLES="${SUBTITLE_GROUP}"` : '';
    const audioAttr = hasAudio ? `,AUDIO="${AUDIO_GROUP}"` : '';
    // FRAME-RATE recommandé par Apple pour les renditions > 30 fps (ou toutes > 25 fps)
    const frameRateAttr =
      r.frameRate != null ? `,FRAME-RATE=${r.frameRate.toFixed(3)}` : '';

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${avgBandwidth},` +
        `RESOLUTION=${resolution},CODECS="${codecs}"${frameRateAttr}${audioAttr}${subsAttr}`,
      variantRelativePath(r.playlistPath),
      '',
    );
  }

  return lines.join('\n');
}
