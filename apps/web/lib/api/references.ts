import { del, get, patch, post } from "./client";

export type ReferenceRow = { id: string; code: string; label: string };

export const referencesApi = {
  getAll: () => get<any>("/references"),
  getResource: (resource: string) => get<ReferenceRow[]>(`/references/${resource}`),
  create: (resource: string, body: { code: string; label: string }) =>
    post<ReferenceRow & { message?: string }>(`/references/${resource}`, body),
  update: (resource: string, id: string, body: { label?: string; code?: string }) =>
    patch<ReferenceRow & { message?: string }>(`/references/${resource}/${id}`, body),
  remove: (resource: string, id: string) =>
    del<{ message?: string }>(`/references/${resource}/${id}`),
};
