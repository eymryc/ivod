/**
 * Module API — Streams vidéo.
 * Récupère les URLs de lecture HLS/MP4 pour les contenus et épisodes.
 */

import { api } from '../client';
import { ApiError } from '@/core/errors';

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  objectKey?: string;
  src?: string;
}

/** Informations de stream retournées par l'API. */
export interface StreamInfo {
  url: string;
  format?: string;
  playbackToken?: string;
  assetId?: string;
  subtitleTracks?: SubtitleTrack[];
  storyboard?: { spriteUrl?: string; vttUrl?: string };
}

export const videoApi = {
  /**
   * Récupère l'URL de stream d'un contenu.
   * Normalise les champs url / playbackUrl selon la version de l'API.
   */
  getStream: async (contentId: string): Promise<StreamInfo> => {
    const data = await api.get<StreamInfo & { playbackUrl?: string }>(
      `/videos/${contentId}/stream`,
    );
    const url = data.url ?? data.playbackUrl;
    if (!url) throw new ApiError(502, 'URL de lecture manquante', 'STREAM_URL_MISSING');
    return {
      url,
      format: data.format,
      playbackToken: data.playbackToken,
      assetId: data.assetId,
      subtitleTracks: data.subtitleTracks,
      storyboard: data.storyboard,
    };
  },

  /**
   * Récupère l'URL de stream d'un épisode.
   */
  getEpisodeStream: async (episodeId: string): Promise<StreamInfo> => {
    const data = await api.get<StreamInfo & { playbackUrl?: string }>(
      `/videos/episodes/${episodeId}/stream`,
    );
    const url = data.url ?? data.playbackUrl;
    if (!url) throw new ApiError(502, 'URL de lecture manquante', 'STREAM_URL_MISSING');
    return {
      url,
      format: data.format,
      playbackToken: data.playbackToken,
      assetId: data.assetId,
      subtitleTracks: data.subtitleTracks,
      storyboard: data.storyboard,
    };
  },
};
