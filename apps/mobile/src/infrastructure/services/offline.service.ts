/**
 * Service Offline — Gestion des téléchargements et de la lecture hors ligne.
 *
 * Responsabilités (Single Responsibility) :
 * - Maintenir un index des contenus disponibles offline (AsyncStorage)
 * - Télécharger les fichiers vidéo et poster dans le FileSystem
 * - Enregistrer le téléchargement côté API via downloadApi
 * - Fournir une interface de lecture directe depuis le stockage local
 *
 * NB : Ce service est la seule source de vérité pour le stockage offline.
 * Les écrans/hooks interagissent via cette interface, jamais directement
 * avec AsyncStorage ou FileSystem.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { downloadApi } from '../api/modules/download.api';
import { videoApi } from '../api/modules/video.api';
import type { OfflineItem } from '@/core/entities';

// ─── Constantes ────────────────────────────────────────────────────────────

const INDEX_KEY = 'ivod_offline_index';
const OFFLINE_DIR = `${FileSystem.documentDirectory}offline/`;

// ─── Index (persistance) ───────────────────────────────────────────────────

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

// ─── Téléchargement de fichier ─────────────────────────────────────────────

async function downloadFile(url: string, dest: string): Promise<string> {
  const result = await FileSystem.downloadAsync(url, dest);
  return result.uri;
}

// ─── Interface publique ────────────────────────────────────────────────────

/** Récupère tous les contenus disponibles hors ligne. */
export async function getOfflineItems(): Promise<OfflineItem[]> {
  return readIndex();
}

/** Récupère un contenu offline par son contentId. */
export async function getOfflineByContentId(contentId: string): Promise<OfflineItem | null> {
  const items = await readIndex();
  return items.find((i) => i.contentId === contentId) ?? null;
}

/**
 * Supprime un contenu offline : fichiers locaux + entrée d'index.
 * Silencieux sur les erreurs de suppression de fichiers (idempotent).
 */
export async function removeOfflineItem(downloadId: string): Promise<void> {
  const items = await readIndex();
  const item = items.find((i) => i.downloadId === downloadId);

  if (item?.localVideoUri) {
    await FileSystem.deleteAsync(item.localVideoUri, { idempotent: true }).catch(() => undefined);
  }
  if (item?.posterLocalUri) {
    await FileSystem.deleteAsync(item.posterLocalUri, { idempotent: true }).catch(() => undefined);
  }

  await writeIndex(items.filter((i) => i.downloadId !== downloadId));
}

/**
 * Télécharge un contenu pour la lecture hors ligne.
 *
 * Étapes :
 * 1. Enregistre le téléchargement côté API (droits DRM)
 * 2. Récupère l'URL de stream
 * 3. Télécharge le poster (optionnel, non bloquant)
 * 4. Télécharge le fichier vidéo MP4 (si format compatible)
 * 5. Persiste l'entrée dans l'index
 *
 * @param onProgress - Callback de progression (0–100)
 */
export async function downloadContentOffline(
  contentId: string,
  meta: { title: string; thumbnailUrl?: string },
  onProgress?: (pct: number) => void,
): Promise<OfflineItem> {
  onProgress?.(5);

  // Étape 1 : Enregistrement côté API
  const registration = await downloadApi.register(contentId);
  const downloadId = registration.downloadId ?? registration.id;

  onProgress?.(15);

  // Étape 2 : URL de stream
  const stream = await videoApi.getStream(contentId);
  const format = stream.format === 'MP4' ? 'MP4' : ('HLS' as const);

  await ensureDir();

  // Étape 3 : Poster local (échec silencieux)
  let posterLocalUri: string | undefined;
  if (meta.thumbnailUrl) {
    const ext = meta.thumbnailUrl.includes('.png') ? 'png' : 'jpg';
    posterLocalUri = await downloadFile(
      meta.thumbnailUrl,
      `${OFFLINE_DIR}${contentId}_poster.${ext}`,
    ).catch(() => undefined);
  }

  onProgress?.(30);

  // Étape 4 : Vidéo MP4 (HLS non supporté en offline natif)
  let localVideoUri: string | undefined;
  if (format === 'MP4') {
    localVideoUri = await downloadFile(
      stream.url,
      `${OFFLINE_DIR}${contentId}.mp4`,
    ).catch((e) => {
      console.warn('[OfflineService] Échec téléchargement MP4', e);
      return undefined;
    });
    onProgress?.(95);
  }

  // Étape 5 : Persistance dans l'index
  const item: OfflineItem = {
    downloadId,
    contentId,
    title: meta.title,
    thumbnailUrl: meta.thumbnailUrl,
    posterLocalUri,
    localVideoUri,
    format,
    expiresAt: registration.expiresAt,
    savedAt: new Date().toISOString(),
  };

  const currentIndex = await readIndex();
  const filtered = currentIndex.filter((i) => i.contentId !== contentId);
  await writeIndex([...filtered, item]);

  onProgress?.(100);
  return item;
}
