/** TTL JWT pour télécharger tous les segments HLS d'une session (défaut 4 h). */
export function resolveDownloadPlaybackTokenTtl(): string {
  const sec = parseInt(process.env.DOWNLOAD_PLAYBACK_TOKEN_TTL_SEC ?? '14400', 10);
  if (!Number.isNaN(sec) && sec >= 300 && sec <= 86_400) {
    return `${sec}s`;
  }
  return '4h';
}

export function downloadTokenExpiresAt(): string {
  const ttl = resolveDownloadPlaybackTokenTtl();
  const sec = ttl.match(/^(\d+)s$/);
  if (sec) return new Date(Date.now() + parseInt(sec[1], 10) * 1000).toISOString();
  if (ttl.endsWith('m')) {
    return new Date(Date.now() + parseInt(ttl, 10) * 60 * 1000).toISOString();
  }
  if (ttl.endsWith('h')) {
    return new Date(Date.now() + parseInt(ttl, 10) * 3600 * 1000).toISOString();
  }
  return new Date(Date.now() + 4 * 3600 * 1000).toISOString();
}
