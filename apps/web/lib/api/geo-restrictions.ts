import { get, post, del } from "./client";

export const geoRestrictionsApi = {
  list: (contentId: string) =>
    get<any[]>(`/geo-restrictions/contents/${contentId}`, true),
  add: (contentId: string, data: { isoCode: string; mode: "ALLOW" | "BLOCK"; reason?: string }) =>
    post<any>(`/geo-restrictions/contents/${contentId}`, data),
  remove: (contentId: string, isoCode: string) =>
    del<any>(`/geo-restrictions/contents/${contentId}/${isoCode}`),
};
