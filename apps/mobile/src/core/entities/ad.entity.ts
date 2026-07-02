/**
 * Entités du domaine Publicité (AVOD).
 *
 * Les contenus en mode AVOD (Advertising Video On Demand) affichent
 * une publicité avant de démarrer la lecture.
 */

/** Types de publicité supportés. */
export type AdType = 'video' | 'image' | 'banner';

/** Configuration d'une publicité à afficher. */
export interface Ad {
  id: string;
  type: AdType;
  /** URL du média publicitaire (vidéo ou image). */
  url?: string;
  /** URL de destination au clic sur la pub. */
  link?: string;
  /** Délai en secondes avant que le bouton "Passer" apparaisse. */
  skipAfter?: number;
  /** Message contextuel affiché avec la pub. */
  message?: string;
}
