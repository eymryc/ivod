/** URL lecteur plein écran pour la modération admin (retour vers la liste admin). */
export function adminWatchHref(
  content: { id: string; previewEpisodeId?: string | null },
  returnPath?: string,
): string {
  const params = new URLSearchParams();
  params.set("review", "1");
  if (content.previewEpisodeId) params.set("ep", content.previewEpisodeId);
  if (returnPath) params.set("return", returnPath);
  return `/watch/${content.id}?${params.toString()}`;
}
