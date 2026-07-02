import { get, post, patch, del } from "./client";

export const commentsApi = {
  list: (contentId: string, page = 1, limit = 20) =>
    get<any>(`/comments/contents/${contentId}?page=${page}&limit=${limit}`),
  create: (contentId: string, body: string, parentId?: string) =>
    post<any>(`/comments/contents/${contentId}`, { body, parentId }),
  update: (id: string, body: string) =>
    patch<any>(`/comments/${id}`, { body }),
  remove: (id: string) =>
    del<any>(`/comments/${id}`),
};
