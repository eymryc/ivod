import { ApiError } from './index';

/** Stream HLS : pas de fichier MP4 local téléchargeable. */
export class OfflineHlsUnsupportedError extends ApiError {
  constructor() {
    super(
      422,
      'Ce titre utilise le streaming adaptatif (HLS). La lecture hors ligne n’est pas encore disponible sur mobile.',
      'OFFLINE_HLS_UNSUPPORTED',
    );
  }
}
