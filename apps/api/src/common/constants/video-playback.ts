/** Statuts vidéo lisibles (aperçu studio ou catalogue) */
export const PLAYABLE_VIDEO_STATUSES = ['READY_PREVIEW', 'READY', 'PUBLISHED'] as const;

export type PlayableVideoStatus = (typeof PLAYABLE_VIDEO_STATUSES)[number];

export function isPlayableVideoStatus(status: string | null | undefined): boolean {
  return !!status && (PLAYABLE_VIDEO_STATUSES as readonly string[]).includes(status);
}

/** Même règle que `videoPlayable` côté studio (contents.service) */
export function canReadVideoAsset(asset: {
  status: string;
  manifestPath?: string | null;
  sourceObjectKey?: string | null;
} | null | undefined): boolean {
  if (!asset || asset.status === 'FAILED') return false;
  return !!(asset.manifestPath || asset.sourceObjectKey);
}
