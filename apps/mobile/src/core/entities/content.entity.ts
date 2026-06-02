import type { PromoVideosBundle } from './promo.entity';

/**
 * Entités du domaine Contenu.
 *
 * Regroupe les types liés aux contenus vidéo : films, séries, épisodes,
 * saisons, assets media, droits d'accès et progression de visionnage.
 */

// ─── Références (types de base référencés dans les entités) ────────────────

export interface ContentTypeRef {
  code: string;
  label: string;
}

export interface GenreRef {
  code: string;
  label: string;
}

export interface ContentGenre {
  genre: GenreRef;
}

// ─── Media ─────────────────────────────────────────────────────────────────

/** Asset associé à un contenu (bande-annonce, poster, etc.). */
export interface MediaAsset {
  id?: string;
  type?: { code: string };
  objectKey?: string;
  url?: string;
}

// ─── Créateur ──────────────────────────────────────────────────────────────

export interface ContentCreator {
  id: string;
  stageName: string;
  avatarUrl?: string | null;
  verified?: boolean;
}

// ─── Progression de visionnage ─────────────────────────────────────────────

/** Progression de l'utilisateur sur ce contenu. */
export interface UserProgress {
  watchedSeconds?: number;
  percentage?: number;
  completed?: boolean;
  /** ID de l'épisode en cours pour une série. */
  episodeId?: string | null;
}

// ─── Contenu ───────────────────────────────────────────────────────────────

/**
 * Représentation complète d'un contenu (film, série, web-série, live, etc.)
 * telle que retournée par GET /contents/:id.
 */
export interface Content {
  id: string;
  title: string;
  description?: string | null;
  /** URL du poster (image portrait). Prioritaire sur thumbnailUrl. */
  posterUrl?: string | null;
  /** URL de la miniature (image paysage). */
  thumbnailUrl?: string | null;
  contentType?: ContentTypeRef;
  /** Code court du type (SERIE, WEB_SERIE, FILM…). */
  contentTypeCode?: string;
  contentGenres?: ContentGenre[];
  visibility?: string;
  monetization?: string;
  creator?: ContentCreator;
  mediaAssets?: MediaAsset[];
  promoVideos?: PromoVideosBundle;
  status?: { code: string; label?: string } | string;
  userProgress?: UserProgress | null;
  duration?: number | null;
  viewCount?: number;
  publishedAt?: string | null;
}

/** Résultat paginé d'une liste de contenus. */
export interface ContentListResult {
  items: Content[];
  total: number;
}

// ─── Droits d'accès ────────────────────────────────────────────────────────

/** Droit d'accès d'un utilisateur sur un contenu donné. */
export interface Entitlement {
  /** L'utilisateur peut lire le contenu. */
  hasAccess: boolean;
  canPlay?: boolean;
  /**
   * Raison du type d'accès :
   * - "SVOD" : abonnement requis
   * - "AVOD" : accès gratuit avec publicités
   * - "TVOD" : achat à l'unité
   * - "GEO_BLOCKED" : indisponible
   */
  reason?: string;
  ppvPrice?: number | null;
  visibility?: string;
}

// ─── Saisons & Épisodes ────────────────────────────────────────────────────

/** Épisode appartenant à une saison. */
export interface Episode {
  id: string;
  contentId?: string;
  seasonId?: string;
  /** Numéro de saison (redondant mais pratique). */
  seasonNumber?: number;
  episodeNumber?: number;
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  publishedAt?: string | null;
  watched?: boolean;
  progress?: number;
}

/** Saison d'une série avec ses épisodes. */
export interface Season {
  id: string;
  contentId?: string;
  seasonNumber: number;
  title?: string | null;
  episodes: Episode[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Retourne true si le contenu est une série ou web-série. */
export function isSeries(content: Pick<Content, 'contentType' | 'contentTypeCode'>): boolean {
  const code = content.contentType?.code ?? content.contentTypeCode;
  return code === 'SERIE' || code === 'WEB_SERIE';
}

/** Retourne la meilleure URL d'image disponible pour un contenu. */
export function getContentPosterUrl(content: Pick<Content, 'posterUrl' | 'thumbnailUrl'>): string | null {
  return content.posterUrl ?? content.thumbnailUrl ?? null;
}

/** Extrait l'URL ou la clé S3 d'un asset de type TRAILER. */
export function findTrailerAsset(content: Pick<Content, 'mediaAssets'>): MediaAsset | null {
  return content.mediaAssets?.find((a) => a.type?.code === 'TRAILER') ?? null;
}
