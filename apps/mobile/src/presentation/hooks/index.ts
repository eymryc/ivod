/**
 * Point d'entrée des hooks de présentation.
 * Importer depuis ici pour rester indépendant des sous-dossiers.
 */
export { useAuth } from './use-auth';
export type { UseAuthResult } from './use-auth';

export { useContentDetail } from './use-content-detail';
export type { UseContentDetailResult } from './use-content-detail';

export { useFavorite } from './use-favorite';
export type { UseFavoriteResult } from './use-favorite';

export { useDownload } from './use-download';
export type { UseDownloadResult } from './use-download';

export { useWatchSession } from './use-watch-session';
export type { UseWatchSessionResult } from './use-watch-session';
