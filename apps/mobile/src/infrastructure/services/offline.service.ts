/**
 * Service Offline — Gestion des téléchargements et de la lecture hors ligne.
 * HLS : cache segments + manifests locaux. MP4 : fichier unique.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadApi } from '../api/modules/download.api';
import { videoApi } from '../api/modules/video.api';
import { downloadHlsOffline } from './hls-offline-downloader';
import type { OfflineItem } from '@/core/entities';

const INDEX_KEY = 'ivod_offline_index';
const OFFLINE_DIR = `${FileSystem.documentDirectory}offline/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(OFFLINE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
  }
}

async function readIndex(): Promise<OfflineItem[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineItem[];
  } catch {
    return [];
  }
}

async function writeIndex(items: OfflineItem[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(items));
}

async function downloadFile(url: string, dest: string): Promise<string> {
  const result = await FileSystem.downloadAsync(url, dest);
  return result.uri;
}

function indexKey(contentId: string, episodeId?: string): string {
  return episodeId ? `${contentId}:${episodeId}` : contentId;
}

function offlineDirFor(downloadId: string): string {
  return `${OFFLINE_DIR}${downloadId}/`;
}

export async function getOfflineItems(): Promise<OfflineItem[]> {
  return readIndex();
}

export async function getOfflineByContentId(
  contentId: string,
  episodeId?: string,
): Promise<OfflineItem | null> {
  const items = await readIndex();
  const key = indexKey(contentId, episodeId);
  return (
    items.find((i) => indexKey(i.contentId, i.episodeId) === key) ??
    items.find((i) => i.contentId === contentId && !episodeId && !i.episodeId) ??
    null
  );
}

export async function removeOfflineItem(downloadId: string): Promise<void> {
  const items = await readIndex();
  const item = items.find((i) => i.downloadId === downloadId);

  if (item?.localDir) {
    await FileSystem.deleteAsync(item.localDir, { idempotent: true }).catch(() => undefined);
  } else {
    if (item?.localVideoUri) {
      await FileSystem.deleteAsync(item.localVideoUri, { idempotent: true }).catch(() => undefined);
    }
    if (item?.localManifestUri) {
      const dir = item.localManifestUri.replace(/master\.m3u8$/, '');
      await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => undefined);
    }
  }
  if (item?.posterLocalUri) {
    await FileSystem.deleteAsync(item.posterLocalUri, { idempotent: true }).catch(() => undefined);
  }

  await writeIndex(items.filter((i) => i.downloadId !== downloadId));
}

export interface OfflineDownloadMeta {
  title: string;
  thumbnailUrl?: string;
  episodeId?: string;
  quality?: '480p' | '720p' | '1080p';
}

/**
 * Télécharge un contenu ou un épisode pour la lecture hors ligne.
 */
export async function downloadContentOffline(
  contentId: string,
  meta: OfflineDownloadMeta,
  onProgress?: (pct: number) => void,
): Promise<OfflineItem> {
  const quality = meta.quality ?? '720p';
  onProgress?.(3);

  const registration = await downloadApi.register(contentId, quality, meta.episodeId);
  const downloadId = registration.downloadId ?? registration.id;
  const format =
    registration.format ??
    (registration.masterManifestUrl?.includes('.m3u8') ? 'HLS' : undefined);

  onProgress?.(6);

  await ensureDir();
  const destDir = offlineDirFor(downloadId);
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

  let posterLocalUri: string | undefined;
  if (meta.thumbnailUrl) {
    const ext = meta.thumbnailUrl.includes('.png') ? 'png' : 'jpg';
    const posterKey = meta.episodeId ? `${contentId}_${meta.episodeId}` : contentId;
    posterLocalUri = await downloadFile(
      meta.thumbnailUrl,
      `${destDir}${posterKey}_poster.${ext}`,
    ).catch(() => undefined);
  }

  let localVideoUri: string | undefined;
  let localManifestUri: string | undefined;
  let fileSizeBytes: number | undefined;
  let resolvedFormat: 'MP4' | 'HLS' = 'HLS';

  if (format === 'HLS' || registration.masterManifestUrl) {
    const masterUrl =
      registration.masterManifestUrl ?? registration.downloadUrl ?? null;
    if (!masterUrl) {
      throw new Error('Package HLS indisponible');
    }

    const hlsResult = await downloadHlsOffline({
      masterManifestUrl: masterUrl,
      quality,
      destDir,
      onProgress: (pct) => onProgress?.(Math.min(94, pct)),
    });

    localManifestUri = hlsResult.localManifestUri;
    fileSizeBytes = hlsResult.totalBytes;
    resolvedFormat = 'HLS';
  } else {
    const stream = meta.episodeId
      ? await videoApi.getEpisodeStream(meta.episodeId)
      : await videoApi.getStream(contentId);

    if (stream.format === 'HLS') {
      throw new Error('Ce titre nécessite le cache HLS — réessayez.');
    }

    const fileKey = meta.episodeId ? `${contentId}_${meta.episodeId}` : contentId;
    localVideoUri = await downloadFile(stream.url, `${destDir}${fileKey}.mp4`).catch((e) => {
      console.warn('[OfflineService] Échec téléchargement MP4', e);
      return undefined;
    });

    if (!localVideoUri) {
      throw new Error('Échec du téléchargement vidéo. Réessayez avec une connexion stable.');
    }
    resolvedFormat = 'MP4';
  }

  onProgress?.(98);

  const item: OfflineItem = {
    downloadId,
    contentId,
    episodeId: meta.episodeId,
    title: meta.title,
    thumbnailUrl: meta.thumbnailUrl,
    posterLocalUri,
    localVideoUri,
    localManifestUri,
    localDir: destDir,
    format: resolvedFormat,
    quality,
    fileSizeBytes,
    expiresAt: registration.expiresAt,
    savedAt: new Date().toISOString(),
  };

  const currentIndex = await readIndex();
  const key = indexKey(contentId, meta.episodeId);
  const filtered = currentIndex.filter((i) => indexKey(i.contentId, i.episodeId) !== key);
  await writeIndex([...filtered, item]);

  onProgress?.(100);
  return item;
}
