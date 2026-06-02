/**
 * Stratégie de delivery playback (proxy API vs CDN edge).
 * Compatible nginx : `location /video/ { proxy_pass $API; }`
 */

export function resolvePlaybackTokenTtl(): string {
  const sec = parseInt(process.env.VIDEO_PLAYBACK_TOKEN_TTL_SEC ?? '900', 10);
  if (!Number.isNaN(sec) && sec >= 60 && sec <= 86_400) {
    return `${sec}s`;
  }
  return '15m';
}

export function resolveCdnBaseUrl(): string | null {
  const raw = process.env.VIDEO_CDN_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function isCdnDeliveryEnabled(): boolean {
  return !!resolveCdnBaseUrl();
}

export type BuildMediaUrlParams = {
  apiBase: string;
  contentId: string;
  episodeId?: string;
  objectKey: string;
  playbackToken: string;
};

/** URL de lecture segment / playlist (API proxy ou CDN + même query token). */
export function buildHlsDeliveryUrl(params: BuildMediaUrlParams): string {
  const cdn = resolveCdnBaseUrl();
  const tokenQ = `token=${encodeURIComponent(params.playbackToken)}`;
  const pathQ = `path=${encodeURIComponent(params.objectKey)}`;

  if (cdn) {
    if (params.episodeId) {
      return `${cdn}/videos/episodes/${params.episodeId}/media?${pathQ}&${tokenQ}`;
    }
    return `${cdn}/videos/${params.contentId}/media?${pathQ}&${tokenQ}`;
  }

  if (params.episodeId) {
    return `${params.apiBase}/videos/episodes/${params.episodeId}/media?${pathQ}&${tokenQ}`;
  }
  return `${params.apiBase}/videos/${params.contentId}/media?${pathQ}&${tokenQ}`;
}
