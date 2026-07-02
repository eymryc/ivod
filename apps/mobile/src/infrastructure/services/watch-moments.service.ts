/**
 * Moments iVOD — signets de scène locaux (AsyncStorage), sync API ultérieure.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchMoment {
  id: string;
  profileId: string;
  contentId: string;
  episodeId?: string | null;
  positionSec: number;
  label?: string;
  createdAt: string;
}

const KEY_PREFIX = 'ivod_watch_moments:';

function storageKey(profileId: string): string {
  return `${KEY_PREFIX}${profileId}`;
}

async function readAll(profileId: string): Promise<WatchMoment[]> {
  const raw = await AsyncStorage.getItem(storageKey(profileId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WatchMoment[];
  } catch {
    return [];
  }
}

async function writeAll(profileId: string, items: WatchMoment[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(items));
}

export async function listMoments(
  profileId: string,
  contentId: string,
  episodeId?: string | null,
): Promise<WatchMoment[]> {
  const all = await readAll(profileId);
  return all
    .filter(
      (m) =>
        m.contentId === contentId &&
        (episodeId ? m.episodeId === episodeId : !m.episodeId),
    )
    .sort((a, b) => a.positionSec - b.positionSec);
}

export async function saveMoment(
  profileId: string,
  data: Omit<WatchMoment, 'id' | 'createdAt'>,
): Promise<WatchMoment> {
  const all = await readAll(profileId);
  const moment: WatchMoment = {
    ...data,
    id: `moment-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await writeAll(profileId, [...all, moment]);
  return moment;
}

export async function removeMoment(profileId: string, momentId: string): Promise<void> {
  const all = await readAll(profileId);
  await writeAll(
    profileId,
    all.filter((m) => m.id !== momentId),
  );
}
