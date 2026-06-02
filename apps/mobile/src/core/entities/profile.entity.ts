/**
 * Entités du domaine Profil.
 *
 * Un compte peut gérer plusieurs profils (Netflix-style).
 * Chaque profil a ses propres préférences et contrôles parentaux.
 */

/** Niveau de maturité associé à un profil. */
export interface MaturityRating {
  code: string;
  label: string;
}

/** Profil de visionnage d'un utilisateur. */
export interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  isKids: boolean;
  isDefault: boolean;
  /** Indique si un code PIN a été configuré sur ce profil. */
  hasPin?: boolean;
  maturityRating?: MaturityRating | null;
}

/** Paramètres de contrôle parental d'un profil. */
export interface ParentalControl {
  profileId: string;
  /** Le profil demande un PIN à chaque démarrage de lecture. */
  requirePin: boolean;
  /** Code de restriction de maturité (ex. "PG-13"). */
  maxMaturityCode?: string | null;
}

/** Payload pour créer ou mettre à jour un profil. */
export interface UpsertProfileInput {
  name: string;
  isKids?: boolean;
  avatarUrl?: string;
  pin?: string;
}
