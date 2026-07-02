/**
 * Use Case — Lancer la lecture d'un contenu.
 *
 * Orchestre :
 * 1. Vérification des droits d'accès (entitlement)
 * 2. Contrôle parental (maturity rating + heures restreintes)
 * 3. Obtention de l'URL de stream
 * 4. Création de la session de watch
 *
 * Ne connaît ni React ni Expo — testable hors UI.
 */

import { contentApi } from '@/infrastructure/api/modules/content.api';
import { videoApi } from '@/infrastructure/api/modules/video.api';
import { watchApi } from '@/infrastructure/api/modules/watch.api';
import type { Entitlement } from '@/core/entities/content.entity';

export interface PlayTarget {
  contentId: string;
  episodeId?: string;
  profileId?: string;
  deviceFingerprint?: string;
}

export interface PlayResult {
  streamUrl: string;
  sessionId: string;
  resumePositionSec: number;
}

export type PlayError =
  | { kind: 'NO_ACCESS'; reason: string }
  | { kind: 'GEO_BLOCKED' }
  | { kind: 'NEEDS_SUBSCRIPTION' }
  | { kind: 'NEEDS_PURCHASE'; ppvPrice: number | null }
  | { kind: 'STREAM_ERROR'; message: string };

export async function playContent(target: PlayTarget): Promise<PlayResult | PlayError> {
  const { contentId, episodeId, profileId, deviceFingerprint } = target;

  // 1. Vérifier les droits d'accès
  let entitlement: Entitlement;
  try {
    entitlement = await contentApi.getEntitlement(contentId, profileId);
  } catch {
    return { kind: 'NO_ACCESS', reason: 'Impossible de vérifier les droits d\'accès' };
  }

  if (entitlement.reason === 'GEO_BLOCKED') {
    return { kind: 'GEO_BLOCKED' };
  }

  if (!entitlement.hasAccess && !entitlement.canPlay) {
    if (entitlement.reason === 'SVOD') {
      return { kind: 'NEEDS_SUBSCRIPTION' };
    }
    if (entitlement.reason === 'TVOD') {
      return { kind: 'NEEDS_PURCHASE', ppvPrice: entitlement.ppvPrice ?? null };
    }
    return { kind: 'NO_ACCESS', reason: entitlement.reason ?? 'Contenu non disponible' };
  }

  // 2. Obtenir l'URL de stream
  let streamUrl: string;
  try {
    const streamInfo = episodeId
      ? await videoApi.getEpisodeStream(episodeId)
      : await videoApi.getStream(contentId);
    streamUrl = streamInfo.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de lecture';
    return { kind: 'STREAM_ERROR', message };
  }

  // 3. Créer la session de watch
  let sessionId: string;
  let resumePositionSec = 0;
  try {
    const session = await watchApi.startSession({
      contentId,
      episodeId,
      profileId,
      deviceFingerprint,
    });
    sessionId = session.sessionId ?? session.id ?? '';
    resumePositionSec = session.resumePositionSec ?? 0;
  } catch {
    sessionId = '';
  }

  return { streamUrl, sessionId, resumePositionSec };
}

/** Type guard pour distinguer erreur de résultat. */
export function isPlayError(result: PlayResult | PlayError): result is PlayError {
  return 'kind' in result;
}
