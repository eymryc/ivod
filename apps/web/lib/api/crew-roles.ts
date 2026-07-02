import { del, get, patch, post } from "./client";

export type CrewRoleRef = {
  id: string;
  code: string;
  label: string;
};

/** Fonctions équipe technique (référentiel global — CRUD admin via /references/crew-roles) */
export const crewRolesApi = {
  list: () => get<CrewRoleRef[]>("/references/crew-roles"),
  create: (body: { code: string; label: string }) =>
    post<CrewRoleRef & { message?: string }>("/references/crew-roles", body),
  update: (id: string, body: { label?: string; code?: string }) =>
    patch<CrewRoleRef & { message?: string }>(`/references/crew-roles/${id}`, body),
  remove: (id: string) => del<{ message?: string }>(`/references/crew-roles/${id}`),
};
