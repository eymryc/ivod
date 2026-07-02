export const SERIES_TYPE_CODES = ['SERIE', 'WEB_SERIE'] as const;
export type SeriesTypeCode = (typeof SERIES_TYPE_CODES)[number];
export function isSeriesType(code: string | null | undefined): boolean {
  return !!code && (SERIES_TYPE_CODES as readonly string[]).includes(code);
}
