import { del, get, patch, post } from "./client";

export type AwardTypeRef = {
  id: string;
  code: string;
  label: string;
};

/** Types de distinction (référentiel global — CRUD admin via /references/award-types) */
export const awardTypesApi = {
  list: () => get<AwardTypeRef[]>("/references/award-types"),
  create: (body: { code: string; label: string }) =>
    post<AwardTypeRef & { message?: string }>("/references/award-types", body),
  update: (id: string, body: { label?: string; code?: string }) =>
    patch<AwardTypeRef & { message?: string }>(`/references/award-types/${id}`, body),
  remove: (id: string) => del<{ message?: string }>(`/references/award-types/${id}`),
};
