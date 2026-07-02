/** Identifiant stable pour listes FlatList (content.id ou contentId API). */
export function contentListKey(item: { id?: string; contentId?: string }, index: number): string {
  const id = item.id?.trim() || item.contentId?.trim();
  return id ? id : `content-row-${index}`;
}

/** Garde la première occurrence par id (ex. historique trié du plus récent au plus ancien). */
export function dedupeContentById<T extends { id?: string; contentId?: string }>(
  items: T[],
): Array<T & { id: string }> {
  const seen = new Set<string>();
  const out: Array<T & { id: string }> = [];
  for (const item of items) {
    const id = item.id?.trim() || item.contentId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...item, id });
  }
  return out;
}
