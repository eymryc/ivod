import { get, post, del } from "./client";

export const reviewsApi = {
  list: (contentId: string) =>
    get<any>(`/reviews/contents/${contentId}`),
  upsert: (contentId: string, data: { rating: number; title?: string; body?: string }) =>
    post<any>(`/reviews/contents/${contentId}`, data),
  remove: (contentId: string) =>
    del<any>(`/reviews/contents/${contentId}`),
};
