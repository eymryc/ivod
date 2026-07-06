import { get, post, put, patch, del, buildQueryString } from "./client";

export interface VideoPipelineSettings {
  detectedCpuLimit: number;
  maxQualityCode: string;
  maxQualityCodeByPlan: Record<string, string> | null;
  workerConcurrency: number;
  workerConcurrencyIsOverride: boolean;
  /** Toujours dérivé de detectedCpuLimit ÷ workerConcurrency — jamais réglable indépendamment. */
  ffmpegThreads: number;
  recommendedConcurrency: number;
  recommendedThreads: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpdateVideoPipelineSettingsInput {
  maxQualityCode?: string;
  maxQualityCodeByPlan?: Record<string, string> | null;
  workerConcurrencyOverride?: number | null;
}

export const adminApi = {
  // Dashboard
  getDashboard: () => get<any>("/admin/dashboard", true),

  // Contenus modération
  getContents: (params?: { status?: string; page?: number; limit?: number }) =>
    get<any>(`/admin/contents${buildQueryString(params)}`, true),
  approveContent: (id: string) => put<any>(`/admin/contents/${id}/approve`),
  rejectContent: (id: string, reason: string) => put<any>(`/admin/contents/${id}/reject`, { reason }),
  approveEpisode: (id: string) => put<any>(`/admin/episodes/${id}/approve`),
  rejectEpisode: (id: string, reason: string) => put<any>(`/admin/episodes/${id}/reject`, { reason }),

  // File de modération
  getModerationQueue: (params?: { status?: string; page?: number }) =>
    get<any>(`/moderation/queue${buildQueryString(params)}`, true),
  assignItem: (id: string) => patch<any>(`/moderation/queue/${id}/assign`),
  completeItem: (id: string) => patch<any>(`/moderation/queue/${id}/complete`),
  getReports: (params?: { status?: string; page?: number }) =>
    get<any>(`/moderation/reports${buildQueryString(params)}`, true),
  handleReport: (id: string, action: "REVIEWED" | "DISMISSED" | "ACTIONED") =>
    patch<any>(`/moderation/reports/${id}`, { action }),

  // Utilisateurs
  getUsers: (params?: { page?: number; search?: string; limit?: number }) =>
    get<any>(`/admin/users${buildQueryString(params)}`, true),
  toggleUserActive: (id: string) => put<any>(`/admin/users/${id}/toggle-active`),

  // Créateurs
  getCreators: (page = 1, limit = 20, search?: string) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search?.trim()) qs.set("search", search.trim());
    return get<any>(`/admin/creators?${qs}`, true);
  },
  getCreator: (id: string) => get<any>(`/admin/creators/${id}`, true),
  createCreator: (data: {
    email: string; firstName: string; lastName: string;
    stageName: string; bio?: string;
  }) => post<any>("/admin/creators", data),
  verifyCreator: (id: string) => put<any>(`/admin/creators/${id}/verify`),
  resendInvite: (id: string) => post<any>(`/admin/creators/${id}/resend-invite`),

  // Bannières
  getBanners: () => get<any[]>("/banners/all", true),
  createBanner: (data: any) => post<any>("/banners", data),
  updateBanner: (id: string, data: any) => patch<any>(`/banners/${id}`, data),
  deleteBanner: (id: string) => del<any>(`/banners/${id}`),
  getBannerUploadUrl: (mimeType: string, slot: "desktop" | "mobile") =>
    post<{ uploadUrl: string; objectKey: string }>("/banners/upload-url", { mimeType, slot }),
  trackBannerImpression: (id: string) => post<void>(`/banners/${id}/impression`, {}),
  trackBannerClick: (id: string) => post<void>(`/banners/${id}/click`, {}),
  searchContents: (q: string) => {
    const qs = new URLSearchParams({ q, limit: "10" });
    return get<any>(`/search/autocomplete?${qs}`, true);
  },

  // Paiements Paystack
  getPayments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    if (params?.provider) q.set("provider", params.provider);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return get<any>(`/payments/admin/list${qs ? `?${qs}` : ""}`, true);
  },
  getPayment: (id: string) => get<any>(`/payments/admin/${id}`, true),

  refundPayment: (paymentId: string, data?: { reason?: string; merchantNote?: string }) =>
    post<any>(`/refunds/admin/payments/${paymentId}`, data ?? {}),

  getRefunds: (params?: { page?: number; limit?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return get<any>(`/refunds/admin/list${qs ? `?${qs}` : ""}`, true);
  },

  processRefundRequest: (refundId: string, action: "approve" | "reject") =>
    patch<any>(`/refunds/admin/${refundId}`, { action }),

  // Finance
  getStatements: (params?: { status?: string; page?: number }) =>
    get<any>(`/revenue/statements${buildQueryString(params)}`, true),
  calculateRevenue: (year: number, month: number) =>
    post<any>(`/revenue/calculate/${year}/${month}`),
  payStatement: (id: string) => patch<any>(`/revenue/statements/${id}/pay`),

  // Pipeline vidéo — ressources détectées + réglages, appliqué sans redéploiement
  getVideoPipelineSettings: () =>
    get<VideoPipelineSettings>("/admin/video-pipeline/settings", true),
  updateVideoPipelineSettings: (data: UpdateVideoPipelineSettingsInput) =>
    put<VideoPipelineSettings>("/admin/video-pipeline/settings", data),
};
