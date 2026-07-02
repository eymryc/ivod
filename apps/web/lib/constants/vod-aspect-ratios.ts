/**
 * Ratios d’affichage viewer iVOD — référence unique.
 *
 * | Zone              | Ratio cible | Fit        | Usage                    |
 * |-------------------|-------------|------------|--------------------------|
 * | Cartes catalogue  | 2:3         | contain    | Posters portrait         |
 * | Hero BA / teaser  | 16:9        | contain    | Bandes-annonces          |
 * | Fiche bannière    | 16:9        | cover      | Décor (banner/poster)    |
 * | Player /watch     | écran       | contain    | Film / épisode intégral  |
 * | Modal promo       | 16:9        | contain    | BA, teaser, extrait      |
 * | Épisodes liste    | 16:9        | cover      | Vignettes pipeline       |
 * | Accueil hero      | 16:9        | cover      | Image marketing          |
 */

/** Bandeau hero catalogue / fiche pour vidéos promo (BA, teaser). */
export const VOD_PROMO_HERO_ASPECT = 16 / 9;

/** Affiches rails et grilles catalogue. */
export const VOD_POSTER_ASPECT = 2 / 3;

/** Classe Tailwind bandeau 16:9 pleine largeur. */
export const VOD_HERO_VIDEO_FRAME_CLASS = "catalog-hero-video-frame";
