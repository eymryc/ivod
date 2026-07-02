/** Hauteur bannière hero — page d’accueil (plus compacte que la v1 plein écran) */
export const HERO_BANNER_SIZE_CLASS =
  "aspect-[16/9] max-h-[min(68vh,620px)] md:max-h-[min(72vh,700px)] min-h-[min(44vh,300px)] md:min-h-[min(50vh,400px)]";

/** Bannière fiche contenu — plus basse que l’accueil */
export const CONTENT_DETAIL_HERO_BANNER_SIZE_CLASS =
  "aspect-[16/9] max-h-[min(52vh,480px)] md:max-h-[min(58vh,540px)] min-h-[min(34vh,260px)] md:min-h-[min(40vh,320px)]";

/** Hero pleine largeur page d’accueil */
export const HOME_HERO_CLASS = `relative w-full ${HERO_BANNER_SIZE_CLASS} bg-background-deep overflow-hidden -mt-16`;

/** Zone texte / CTA hero accueil (au-dessus des pills & indicateurs carousel) */
export const HOME_HERO_CONTENT_POS =
  "absolute left-0 right-0 bottom-14 sm:bottom-16 md:bottom-20 lg:bottom-24";

/** Zone image bannière fiche contenu (dans ContentHero) */
export const CONTENT_DETAIL_HERO_BANNER_CLASS = `relative w-full ${CONTENT_DETAIL_HERO_BANNER_SIZE_CLASS} overflow-hidden`;

import { VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";

/** Conteneur fiche contenu — même largeur que la navbar */
export const CONTENT_DETAIL_PAGE_SHELL = VIEWER_SHELL_WIDTH;

/** Grille barre hero fiche (colonne 1 = Lecture) */
export const CONTENT_DETAIL_HERO_GRID_CLASS =
  "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 items-start";

/** Colonne bouton Lecture — même largeur que le CTA */
export const CONTENT_DETAIL_ACTION_COL_CLASS =
  "flex flex-col gap-3 order-2 lg:order-1 w-full max-w-full sm:max-w-[240px]";
