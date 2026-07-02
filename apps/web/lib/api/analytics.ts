import { get } from "./client";

export const analyticsApi = {
  getCreatorStats: (period: "7d" | "30d" | "90d" = "30d") =>
    get<any>(`/analytics/creators/me?period=${period}`, true),

  getContentStats: (contentId: string, period: "7d" | "30d" | "90d" = "30d") =>
    get<any>(`/analytics/contents/${contentId}?period=${period}`, true),
};
