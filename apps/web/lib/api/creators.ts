import { buildQueryString, get, patch, post } from "./client";

export interface CreatorProfile {
  id: string;
  stageName: string;
  bio?: string | null;
  avatarObjectKey?: string | null;
  bannerObjectKey?: string | null;
  verified?: boolean;
  subscriberCount?: number;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
  };
  _count?: { contents?: number };
}

export interface UpdateMyCreatorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  stageName?: string;
  bio?: string;
  avatarObjectKey?: string;
  bannerObjectKey?: string;
}

export const creatorsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = buildQueryString(params);
    return get<any>(`/creators${qs}`);
  },
  getOne: (id: string) => get<any>(`/creators/${id}`),
  getMe: () => get<CreatorProfile>("/creators/me", true),
  updateMe: (data: UpdateMyCreatorInput) => patch<CreatorProfile>("/creators/me", data, true),
  getUploadUrl: (mimeType: string, slot: "avatar" | "banner") =>
    post<{ uploadUrl: string; objectKey: string }>("/creators/me/upload-url", { mimeType, slot }, true),
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
