/**
 * Entités du domaine Téléchargement (lecture hors ligne).
 *
 * Représente l'état d'un contenu téléchargé localement sur l'appareil.
 */

/** Format du fichier vidéo téléchargé. */
export type OfflineFormat = 'MP4' | 'HLS';

/** Statut du téléchargement en cours. */
export type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

/**
 * Métadonnées d'un contenu disponible hors ligne.
 * Stocké dans l'index AsyncStorage et référencé par le fichier système.
 */
export interface OfflineItem {
  /** Identifiant côté API (retourné par POST /downloads). */
  downloadId: string;
  contentId: string;
  title: string;
  thumbnailUrl?: string;
  /** URI locale du poster (copie dans FileSystem). */
  posterLocalUri?: string;
  /** URI locale du fichier vidéo MP4. Undefined si HLS ou si échec. */
  localVideoUri?: string;
  format: OfflineFormat;
  /** Date d'expiration ISO 8601 côté API. */
  expiresAt?: string;
  savedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Retourne l'URI locale jouable directement, ou null si lecture en ligne requise.
 */
export function getOfflinePlaybackUri(item: OfflineItem): string | null {
  return item.localVideoUri ?? null;
}

/**
 * Libellé du badge affiché sur le contenu en lecture.
 */
export function getOfflineBadgeLabel(item: OfflineItem): string {
  if (item.localVideoUri) return 'Hors ligne';
  if (item.format === 'HLS') return 'Métadonnées (HLS)';
  return 'En ligne requis';
}

/** Indique si un item offline est expiré. */
export function isOfflineItemExpired(item: OfflineItem): boolean {
  if (!item.expiresAt) return false;
  return new Date(item.expiresAt) < new Date();
}
