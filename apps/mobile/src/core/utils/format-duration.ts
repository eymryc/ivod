/** Durée en secondes — aligné web formatDuration */
export function formatDuration(seconds?: number | null): string | null {
  if (!seconds || seconds < 1) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}
