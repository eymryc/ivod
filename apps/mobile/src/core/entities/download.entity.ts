/**
 * Entités du domaine Téléchargement (lecture hors ligne).
 */

/** Format du fichier vidéo téléchargé. */
export type OfflineFormat = 'MP4' | 'HLS';

/** Statut du téléchargement en cours. */
export type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

/**
 * Métadonnées d'un contenu disponible hors ligne.
 */
export interface OfflineItem {
  downloadId: string;
  contentId: string;
  episodeId?: string;
  title: string;
  thumbnailUrl?: string;
  posterLocalUri?: string;
  /** MP4 local (legacy / fallback). */
  localVideoUri?: string;
  /** Master HLS local (`file://…/master.m3u8`). */
  localManifestUri?: string;
  /** Dossier racine du cache offline. */
  localDir?: string;
  format: OfflineFormat;
  quality?: string;
  fileSizeBytes?: number;
  expiresAt?: string;
  savedAt: string;
}

export function getOfflinePlaybackUri(item: OfflineItem): string | null {
  if (item.localManifestUri) return item.localManifestUri;
  return item.localVideoUri ?? null;
}

export function getOfflineBadgeLabel(item: OfflineItem): string {
  if (item.localManifestUri || item.localVideoUri) {
    return item.episodeId ? 'Épisode hors ligne' : 'Hors ligne';
  }
  if (item.format === 'HLS') return 'Téléchargement incomplet';
  return 'En ligne requis';
}

export function isOfflineItemExpired(item: OfflineItem): boolean {
  if (!item.expiresAt) return false;
  return new Date(item.expiresAt) < new Date();
}
