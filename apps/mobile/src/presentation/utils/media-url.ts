import { assetUrl } from "@/utils/assets";

/** URL d'un asset MinIO — via le proxy API (joignable sur device / LAN). */
export function mediaUrl(objectKey?: string | null): string | undefined {
  if (!objectKey) return undefined;
  if (objectKey.startsWith("http")) return objectKey;
  return assetUrl(objectKey) ?? undefined;
}
