const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
const MEDIA_BASE =
  process.env.EXPO_PUBLIC_MEDIA_URL ?? API_BASE.replace(/\/api\/v1\/?$/, "");

/** URL publique MinIO / CDN pour une clé objet */
export function mediaUrl(objectKey?: string | null): string | undefined {
  if (!objectKey) return undefined;
  if (objectKey.startsWith("http")) return objectKey;
  const key = objectKey.startsWith("/") ? objectKey.slice(1) : objectKey;
  return `${MEDIA_BASE.replace(/\/$/, "")}/${key}`;
}
