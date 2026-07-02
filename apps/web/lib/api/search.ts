import { buildQueryString, get, del } from "./client";
import type { SearchSuggestion } from "@/lib/types/search-suggestion";

export type SearchParams = {
  q: string;
  type?: string;
  genre?: string;
  year?: number;
  minRating?: number;
  maxMaturityRating?: string;
  page?: number;
  limit?: number;
};

export const searchApi = {
  search: (params: SearchParams) => {
    const qs = buildQueryString({
      q: params.q,
      type: params.type,
      genre: params.genre,
      year: params.year,
      minRating: params.minRating,
      maxMaturityRating: params.maxMaturityRating,
      page: params.page,
      limit: params.limit,
    });
    return get<any>(`/search${qs}`, "optional");
  },
  autocomplete: (q: string, maxMaturityRating?: string | null) => {
    const qs = buildQueryString({ q, maxMaturityRating: maxMaturityRating ?? undefined });
    return get<{ suggestions: SearchSuggestion[] }>(`/search/autocomplete${qs}`, "optional");
  },
  getTrending: (period: "1h" | "24h" | "7d" = "24h") =>
    get<any>(`/search/trending?period=${period}`),
  getHistory: () => get<any>("/search/history", true),
  clearHistory: () => del<any>("/search/history"),
};
