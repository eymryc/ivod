/** Hauteur bannière hero — page d’accueil (plus compacte que la v1 plein écran) */
export const HERO_BANNER_SIZE_CLASS =
  "aspect-[16/9] max-h-[min(68vh,620px)] md:max-h-[min(72vh,700px)] min-h-[min(52vh,380px)] md:min-h-[min(50vh,400px)]";

/**
 * Bannière fiche contenu — alignée sur CATALOG_PAGE_HERO_SHOWCASE_CLASS (page
 * Films) : titre/badges/description/boutons vivent maintenant à l'intérieur
 * du bandeau (voir CONTENT_DETAIL_HERO_TITLE_OVERLAY), plus besoin de la barre
 * "façon Prime Video" en dessous — donc la même hauteur généreuse. Uniformisé
 * le 2026-07-06.
 */
export const CONTENT_DETAIL_HERO_BANNER_SIZE_CLASS =
  "aspect-[16/9] min-h-[min(52vh,380px)] md:min-h-[min(68vh,480px)] lg:min-h-[min(74vh,620px)] max-h-[min(88vh,720px)]";

/** Hero pleine largeur page d’accueil */
export const HOME_HERO_CLASS = `relative w-full ${HERO_BANNER_SIZE_CLASS} bg-background-deep overflow-hidden -mt-16`;

/**
 * Zone texte / CTA hero accueil (au-dessus des pills & indicateurs carousel).
 * `top-20` borne la zone sous la navbar fixe (h-20 en haut de page, h-15 une
 * fois "elevated" au scroll — voir Navbar.tsx) : sans cette borne haute, un
 * bloc ancré uniquement par le bas (bottom-14 etc.) grandit librement vers le
 * haut et, sur mobile où le hero est court (min-h ~300px) et qu'un titre de
 * bannière fait 2-3 lignes, finit par chevaucher la navbar au lieu de rester
 * dans le hero. `flex flex-col justify-end` garde le contenu collé au bas de
 * cette zone bornée (même rendu qu'avant quand il y avait la place), et sert
 * de garde-fou si jamais le contenu reste malgré tout trop grand. Trouvé le
 * 2026-07-05 sur un titre de bannière long en test mobile réel.
 */
export const HOME_HERO_CONTENT_POS =
  "absolute inset-x-0 top-20 bottom-3 sm:bottom-16 md:bottom-20 lg:bottom-24 flex flex-col justify-end overflow-hidden";

/** Zone image bannière fiche contenu (dans ContentHero) */
export const CONTENT_DETAIL_HERO_BANNER_CLASS = `relative w-full ${CONTENT_DETAIL_HERO_BANNER_SIZE_CLASS} overflow-hidden`;

import { VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";

/** Conteneur fiche contenu — même largeur que la navbar */
export const CONTENT_DETAIL_PAGE_SHELL = VIEWER_SHELL_WIDTH;

/** Grille barre hero fiche (colonne 1 = Lecture) */
export const CONTENT_DETAIL_HERO_GRID_CLASS =
  "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 items-start";

/** Colonne bouton Lecture — en premier sur mobile (Play avant métadonnées) */
export const CONTENT_DETAIL_ACTION_COL_CLASS =
  "flex flex-col gap-3 order-1 w-full max-w-full sm:max-w-[240px]";

/**
 * Titre / badges / description / boutons / affiche — superposés au bandeau,
 * sous la navbar fixe. `top-20` + `flex flex-col justify-end` = même garde-fou
 * que HOME_HERO_CONTENT_POS (voir plus haut) : jamais de chevauchement avec la
 * navbar quel que soit le contenu. `pointer-events-none` sur le conteneur
 * (laisse la bannière/vidéo de fond recevoir les interactions) — la colonne de
 * contenu réactive `pointer-events-auto` pour ses boutons.
 */
export const CONTENT_DETAIL_HERO_TITLE_OVERLAY =
  "absolute inset-x-0 top-20 bottom-6 md:bottom-8 left-6 md:left-12 lg:left-16 right-6 md:right-12 lg:right-16 z-10 flex flex-col justify-end overflow-hidden pointer-events-none";

/**
 * Bannière profil créateur public — paysage ~3:1 (recommandé 1500×500 px).
 * Hauteur minimale généreuse pour éviter le rognage des logos/textes studio
 * (ex. M.STUDIO) avec object-cover. L’avatar chevauche le bas du bandeau.
 */
export const CREATOR_PROFILE_BANNER_SIZE_CLASS =
  "aspect-[3/1] min-h-[200px] sm:min-h-[220px] md:min-h-[260px] lg:min-h-[300px] max-h-[min(42vw,380px)]";

export const CREATOR_PROFILE_BANNER_CLASS = `relative w-full ${CREATOR_PROFILE_BANNER_SIZE_CLASS} overflow-hidden bg-background-elevated`;

/** Cadrage centré légèrement haut — préserve le branding studio en bas de visuel */
export const CREATOR_PROFILE_BANNER_IMAGE_CLASS =
  "object-cover object-[center_38%] sm:object-[center_42%] md:object-center";

/** Chevauchement avatar / en-tête sur la bannière */
export const CREATOR_PROFILE_HEADER_OVERLAP_CLASS = "-mt-16 sm:-mt-[4.5rem] md:-mt-20";
