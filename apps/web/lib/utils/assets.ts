import { ASSETS_BUCKET, VIDEOS_BUCKET } from "../config/api";

/** Clés MinIO du bucket vidéo (pipeline ffmpeg, pas catalogue ivod-assets). */
const VIDEOS_BUCKET_KEY_PREFIXES = [
  "thumbnails/",
  "hls/",
  "storyboards/",
  "videos/",
  "subtitles/",
] as const;

export function isVideosBucketObjectKey(objectKey: string): boolean {
  const key = objectKey.startsWith("/") ? objectKey.slice(1) : objectKey;
  return VIDEOS_BUCKET_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function bucketForObjectKey(objectKey: string): string {
  return isVideosBucketObjectKey(objectKey) ? VIDEOS_BUCKET : ASSETS_BUCKET;
}

/**
 * URL affiche / vignette — même origine que le front (rewrite Next → API).
 * Évite le blocage CORP (API :3000 vs web :3001) et MinIO privé.
 *
 * ⚠️ Affichage : utiliser {@link MediaImage}, pas `next/image`.
 * Next.js 16 refuse l’optimisation des chemins locaux avec query string
 * (`localPatterns`) — voir https://nextjs.org/docs/app/api-reference/components/image
 */
export function assetUrl(objectKey?: string | null, bucket = ASSETS_BUCKET): string | null {
  if (!objectKey) return null;
  const key = objectKey.startsWith("/") ? objectKey.slice(1) : objectKey;
  const params = new URLSearchParams({ bucket, key });
  return `/media?${params.toString()}`;
}

/** Clé MinIO ou URL déjà résolue → src pour {@link MediaImage}. */
export function resolveMediaSrc(src?: string | null, bucket = ASSETS_BUCKET): string | null {
  if (!src) return null;
  if (
    src.startsWith("/media?") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  return assetUrl(src, bucket);
}

/** URL absolue (partage, e-mail) — nécessite CORP cross-origin côté API */
export function assetAbsoluteUrl(objectKey?: string | null, bucket = ASSETS_BUCKET): string | null {
  if (!objectKey) return null;
  const rel = assetUrl(objectKey, bucket);
  if (!rel || typeof window === "undefined") return rel;
  return `${window.location.origin}${rel}`;
}

export function videoAssetUrl(objectKey?: string | null): string | null {
  return assetUrl(objectKey, VIDEOS_BUCKET);
}

/** Choisit ivod-videos vs ivod-assets selon le préfixe de clé. */
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
  if (!a.type) return "";
  return typeof a.type === "string" ? a.type : a.type.code;
}

export type ContentImageFields = {
  posterObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  videoPosterObjectKey?: string | null;
  mediaAssets?: MediaAssetLike[];
};

export function posterUrl(content: ContentImageFields | null): string | null {
  return cardCoverUrl(content);
}

/** Panneau hover paysage : THUMBNAIL → snapshot vidéo → poster */
export function cardBackdropUrl(content: ContentImageFields | null): string | null {
  if (!content) return null;

  if (content.thumbnailObjectKey) return storageObjectUrl(content.thumbnailObjectKey);
  const thumb = content.mediaAssets?.find((a) => assetTypeCode(a) === "THUMBNAIL");
  if (thumb?.objectKey) return assetUrl(thumb.objectKey);

  if (content.videoPosterObjectKey) return videoAssetUrl(content.videoPosterObjectKey);

  const poster = content.mediaAssets?.find((a) => assetTypeCode(a) === "POSTER");
  if (poster?.objectKey) return assetUrl(poster.objectKey);
  if (content.posterObjectKey) return storageObjectUrl(content.posterObjectKey);

  return cardCoverUrl(content);
}

function pickMediaKey(
  assets: MediaAssetLike[] | undefined,
  code: string,
): string | null {
  if (!assets?.length) return null;
  const primary = assets.find((a) => assetTypeCode(a) === code && a.isPrimary);
  if (primary?.objectKey) return primary.objectKey;
  return assets.find((a) => assetTypeCode(a) === code)?.objectKey ?? null;
}

/** Cartes catalogue : asset primaire POSTER/THUMBNAIL → POSTER → snapshot vidéo → THUMBNAIL */
export function cardCoverUrl(content: ContentImageFields | null): string | null {
  if (!content) return null;

  const assets = content.mediaAssets;
  const primaryCover = assets?.find(
    (a) => a.isPrimary && ["POSTER", "THUMBNAIL"].includes(assetTypeCode(a)),
  );
  if (primaryCover?.objectKey) return assetUrl(primaryCover.objectKey);

  const posterKey = pickMediaKey(assets, "POSTER");
  if (posterKey) return assetUrl(posterKey);
  if (content.posterObjectKey) return storageObjectUrl(content.posterObjectKey);

  if (content.videoPosterObjectKey) return videoAssetUrl(content.videoPosterObjectKey);
  if (content.thumbnailObjectKey) return storageObjectUrl(content.thumbnailObjectKey);

  const thumbKey = pickMediaKey(assets, "THUMBNAIL");
  if (thumbKey) return assetUrl(thumbKey);

  const anyPrimary = assets?.find((a) => a.isPrimary);
  return assetUrl(anyPrimary?.objectKey);
}

/** Alias cover / affiche — même logique que posterUrl */
export function coverUrl(
  content: Parameters<typeof posterUrl>[0] & { videoPosterObjectKey?: string | null },
): string | null {
  return posterUrl(content) ?? videoAssetUrl(content?.videoPosterObjectKey);
}

export function thumbnailUrl(
  content: { thumbnailObjectKey?: string | null; mediaAssets?: MediaAssetLike[] } | null,
): string | null {
  if (!content) return null;
  if (content.thumbnailObjectKey) return storageObjectUrl(content.thumbnailObjectKey);
  if (!content.mediaAssets) return null;
  const thumb = content.mediaAssets.find((a) => assetTypeCode(a) === "THUMBNAIL");
  return assetUrl(thumb?.objectKey);
}

/** Vignette épisode — upload catalogue (ivod-assets) ou pipeline (`thumbnails/…` → ivod-videos). */
export function episodeThumbnailUrl(objectKey?: string | null): string | null {
  return storageObjectUrl(objectKey);
}
