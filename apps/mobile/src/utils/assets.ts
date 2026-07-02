/**
 * Helpers d'URL pour les assets media (images, posters, vignettes).
 * Miroir de apps/web/lib/utils/assets.ts adapté au mobile.
 *
 * Le mobile accède aux images via le proxy API :
 *   {EXPO_PUBLIC_API_URL}/storage/object?bucket=<bucket>&key=<objectKey>
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
const ASSETS_BUCKET = process.env.EXPO_PUBLIC_MINIO_ASSETS_BUCKET ?? 'ivod-assets';
const VIDEOS_BUCKET = process.env.EXPO_PUBLIC_MINIO_VIDEOS_BUCKET ?? 'ivod-videos';

const VIDEOS_BUCKET_KEY_PREFIXES = [
  'thumbnails/',
  'hls/',
  'storyboards/',
  'videos/',
  'subtitles/',
] as const;

function isVideosBucketObjectKey(objectKey: string): boolean {
  const key = objectKey.startsWith('/') ? objectKey.slice(1) : objectKey;
  return VIDEOS_BUCKET_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function bucketForObjectKey(objectKey: string): string {
  return isVideosBucketObjectKey(objectKey) ? VIDEOS_BUCKET : ASSETS_BUCKET;
}

/** URL d'un asset image via le proxy /storage/object de l'API. */
export function assetUrl(objectKey?: string | null, bucket = ASSETS_BUCKET): string | null {
  if (!objectKey) return null;
  const key = objectKey.startsWith('/') ? objectKey.slice(1) : objectKey;
  return `${API_BASE}/storage/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`;
}

export function videoAssetUrl(objectKey?: string | null): string | null {
  return assetUrl(objectKey, VIDEOS_BUCKET);
}

export function storageObjectUrl(objectKey?: string | null): string | null {
  if (!objectKey) return null;
  return assetUrl(objectKey, bucketForObjectKey(objectKey));
}

type MediaAssetLike = {
  type?: { code: string } | string;
  objectKey: string;
  isPrimary?: boolean;
};

function assetTypeCode(a: MediaAssetLike): string {
  if (!a.type) return '';
  return typeof a.type === 'string' ? a.type : a.type.code;
}

export type ContentImageFields = {
  posterObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  videoPosterObjectKey?: string | null;
  mediaAssets?: MediaAssetLike[];
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
};

/**
 * Retourne la meilleure URL d'image pour un contenu.
 * - Priorité : mediaAssets POSTER (primaire) → posterObjectKey → thumbnailObjectKey
 * - Fallback : posterUrl/thumbnailUrl si déjà des URLs absolues (cas rétrocompat)
 */
export function contentPosterUrl(content: ContentImageFields | null): string | null {
  if (!content) return null;

  const assets = content.mediaAssets;

  if (assets?.length) {
    const primary = assets.find(
      (a) => a.isPrimary && ['POSTER', 'THUMBNAIL'].includes(assetTypeCode(a)),
    );
    if (primary?.objectKey) return assetUrl(primary.objectKey);

    const poster = assets.find((a) => assetTypeCode(a) === 'POSTER');
    if (poster?.objectKey) return assetUrl(poster.objectKey);
  }

  if (content.posterObjectKey) return storageObjectUrl(content.posterObjectKey);
  if (content.videoPosterObjectKey) return videoAssetUrl(content.videoPosterObjectKey);
  if (content.thumbnailObjectKey) return storageObjectUrl(content.thumbnailObjectKey);

  if (assets?.length) {
    const thumb = assets.find((a) => assetTypeCode(a) === 'THUMBNAIL');
    if (thumb?.objectKey) return assetUrl(thumb.objectKey);
  }

  if (content.posterUrl) return content.posterUrl;
  if (content.thumbnailUrl) return content.thumbnailUrl;

  return null;
}

/** Vignette épisode */
export function episodeThumbnailUrl(objectKey?: string | null): string | null {
  return storageObjectUrl(objectKey);
}

/** Vignette de l'épisode en cours (reprise série). */
export function resolveEpisodeThumbnailUrl(
  seasons: Array<{
    episodes?: Array<{
      id: string;
      thumbnailObjectKey?: string | null;
      thumbnailUrl?: string | null;
    }>;
  }>,
  episodeId?: string | null,
  fallback?: string | null,
): string | null {
  if (!episodeId) return fallback ?? null;
  for (const season of seasons) {
    const ep = season.episodes?.find((e) => e.id === episodeId);
    if (ep) {
      return (
        ep.thumbnailUrl ?? episodeThumbnailUrl(ep.thumbnailObjectKey) ?? fallback ?? null
      );
    }
  }
  return fallback ?? null;
}

/**
 * Image hero « reprise » pour un film — vignette paysage (frame / key art),
 * pas le poster portrait. Équivalent visuel de la vignette épisode en série.
 */
export function contentResumeHeroUrl(content: ContentImageFields | null): string | null {
  if (!content) return null;
  const backdrop = contentBackdropUrl(content);
  if (backdrop) return backdrop;
  return contentPosterUrl(content);
}

/** Fond hero catalogue — THUMBNAIL → snapshot vidéo → poster (aligné web cardBackdropUrl). */
export function contentBackdropUrl(content: ContentImageFields | null): string | null {
  if (!content) return null;

  if (content.thumbnailObjectKey) return storageObjectUrl(content.thumbnailObjectKey);
  const thumb = content.mediaAssets?.find((a) => assetTypeCode(a) === "THUMBNAIL");
  if (thumb?.objectKey) return assetUrl(thumb.objectKey);

  if (content.videoPosterObjectKey) return videoAssetUrl(content.videoPosterObjectKey);

  const poster = content.mediaAssets?.find((a) => assetTypeCode(a) === "POSTER");
  if (poster?.objectKey) return assetUrl(poster.objectKey);
  if (content.posterObjectKey) return storageObjectUrl(content.posterObjectKey);

  return contentPosterUrl(content);
}
