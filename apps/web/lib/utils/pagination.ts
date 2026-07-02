/** Total depuis une page API paginée (`meta.total` ou `total` legacy) */
export function getPaginatedTotal(page: unknown): number {
  if (!page || typeof page !== "object") return 0;
  const p = page as { total?: number; meta?: { total?: number } };
  return p.meta?.total ?? p.total ?? 0;
}
