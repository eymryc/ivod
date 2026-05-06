import { EPISODIC_TYPE_CODES } from '../constants/content.constants';

/**
 * Normalise a raw content-type code coming from user input or legacy DB rows
 * into the canonical uppercase form used by the application.
 *
 * Examples:
 *   'serie'    → 'SERIES'
 *   'web-serie' → 'WEB_SERIES'
 *   'SINGLE'   → 'SINGLE'
 */
export function normalizeContentTypeCode(code: string | null | undefined): string {
  const normalized = String(code ?? '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .toUpperCase();

  // Legacy seed codes – map to the canonical modern form
  if (normalized === 'SERIE') return 'SERIES';
  if (normalized === 'WEB_SERIE') return 'WEB_SERIES';

  return normalized;
}

/**
 * Returns true when the content type represents an episodic series
 * (SERIES, WEB_SERIES, or the legacy SERIE / WEB_SERIE aliases).
 */
export function isEpisodicContentType(code: string | null | undefined): boolean {
  return EPISODIC_TYPE_CODES.has(normalizeContentTypeCode(code));
}

/**
 * Build the list of candidate code values to try when resolving a
 * ContentTypeRef row in the database. The DB may store both the legacy
 * `code` column value and the modern `typeCode` column value, so we
 * try all known aliases in order.
 */
export function getContentTypeIdCandidates(raw: string): string[] {
  const normalized = normalizeContentTypeCode(raw);
  const trimmed = String(raw ?? '').trim();

  const candidates = new Set<string>([trimmed, normalized]);

  if (normalized === 'SERIES') candidates.add('SERIE');
  if (normalized === 'SERIE') candidates.add('SERIES');

  if (normalized === 'WEB_SERIES' || normalized === 'WEB_SERIE') {
    candidates.add('WEB_SERIES');
    candidates.add('WEB_SERIE');
    candidates.add('WEB SERIE');
    candidates.add('WEB-SERIE');
  }

  return Array.from(candidates);
}
