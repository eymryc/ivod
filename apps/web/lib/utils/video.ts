/** Statuts vidéo permettant la lecture (studio preview ou catalogue) */
export const PLAYABLE_VIDEO_STATUSES = ["READY_PREVIEW", "READY", "PUBLISHED"] as const;

export function isVideoPlayable(status?: string | null): boolean {
  return !!status && (PLAYABLE_VIDEO_STATUSES as readonly string[]).includes(status);
}
