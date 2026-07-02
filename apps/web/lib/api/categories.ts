import { get, post, patch, del } from "./client";

export const categoriesApi = {
  list: () => get<any[]>("/categories"),
  create: (data: { code: string; label: string }) =>
    post<any>("/categories", data),
  update: (id: string, data: { label: string }) =>
    patch<any>(`/categories/${id}`, data),
  remove: (id: string) => del<any>(`/categories/${id}`),
};
