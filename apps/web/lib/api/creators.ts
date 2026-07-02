import { buildQueryString, get } from "./client";

export const creatorsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = buildQueryString(params);
    return get<any>(`/creators${qs}`);
  },
  getOne: (id: string) => get<any>(`/creators/${id}`),
  getMe: () => get<any>("/creators/me", true),
  getMyContents: (params?: { page?: number; limit?: number; status?: string }) => {
    const qs = buildQueryString({
      page: params?.page,
      limit: params?.limit,
      status: params?.status || undefined,
    });
    return get<any>(`/creators/me/contents${qs}`, true);
  },
  getMyAnalytics: (period: "7d" | "30d" | "90d" = "30d") =>
    get<any>(`/analytics/creators/me?period=${period}`, true),
};
