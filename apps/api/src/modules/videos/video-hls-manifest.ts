export interface HlsRenditionRow {
  videoBitrate: number;
  audioBitrate: number;
  width: number;
  height: number;
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

/** Master HLS VOD (#EXTM3U v3) — pistes sous-titres + variants vidéo */
export function buildMasterPlaylistBody(
  renditions: HlsRenditionRow[],
  subtitles: HlsSubtitleRow[] = [],
  audioTracks: HlsAudioRow[] = [],
): string {
  const lines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3', ''];
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

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${avgBandwidth},` +
        `RESOLUTION=${resolution},CODECS="${codecs}"${audioAttr}${subsAttr}`,
      variantRelativePath(r.playlistPath),
      '',
    );
  }

  return lines.join('\n');
}
