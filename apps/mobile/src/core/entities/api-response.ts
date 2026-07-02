/** Enveloppe standard de toutes les réponses de l'API iVOD. */
export interface ApiResponse<T = null> {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
  meta?: ApiMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  timestamp: string;
  version: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}
