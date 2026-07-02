/**
 * Allowlist des mimeType acceptés pour les presigned PUT (upload direct
 * navigateur vers MinIO — voir MinioService.presignedPutUrl). Centralisé ici
 * pour que media-assets, banners et video-subtitles appliquent exactement la
 * même règle plutôt que de dupliquer la liste dans chaque service.
 */
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const ALLOWED_SUBTITLE_MIME_TYPES = new Set([
  'text/vtt',
  'text/plain',
  'application/x-subrip',
]);
