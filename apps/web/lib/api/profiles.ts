import { get, post, patch, put, del } from "./client";

export const profilesApi = {
  list: () => get<any[]>("/profiles", true),
  create: (data: any) => post<any>("/profiles", data),
  update: (id: string, data: any) => patch<any>(`/profiles/${id}`, data),
  remove: (id: string) => del<any>(`/profiles/${id}`),
  setDefault: (id: string) => post<any>(`/profiles/${id}/set-default`),
  verifyPin: (id: string, pin: string) => post<any>(`/profiles/${id}/verify-pin`, { pin }),
  getParentalControl: (profileId: string) =>
    get<any>(`/parental-controls/profiles/${profileId}`, true),
  upsertParentalControl: (profileId: string, data: any) =>
    put<any>(`/parental-controls/profiles/${profileId}`, data),
  deleteParentalControl: (profileId: string) =>
    del<any>(`/parental-controls/profiles/${profileId}`),
};
