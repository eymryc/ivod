import { get, post } from "./client";

export type PaystackConfig = {
  publicKey: string;
  currency: string;
  configured: boolean;
  secretKeyInvalid: boolean;
  simulationAllowed?: boolean;
  simulationMode: boolean;
};

export const paymentsApi = {
  list: (page = 1, limit = 20) =>
    get<any>(`/payments?page=${page}&limit=${limit}`, true),

  getOne: (id: string) => get<any>(`/payments/${id}`, true),

  syncPayment: (id: string) => post<any>(`/payments/${id}/sync`, {}),

  getPaystackConfig: () => get<PaystackConfig>("/payments/config/paystack"),

  initiatePayment: (data: {
    amount: number;
    providerCode: string;
    email?: string;
    phoneNumber?: string;
    planCode?: string;
    contentId?: string;
    userSubscriptionId?: string;
  }) => post<any>("/payments/initiate", data),

  getInvoices: (page = 1) => get<any>(`/invoices?page=${page}`, true),

  generateInvoice: (paymentId: string) => post<any>(`/invoices/generate/${paymentId}`),

  getRefunds: () => get<any[]>("/refunds", true),

  requestRefund: (paymentId: string, reason?: string) =>
    post<any>(`/refunds/${paymentId}`, { reason }),

  /** Admin */
  adminList: (params?: {
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

  adminGetOne: (id: string) => get<any>(`/payments/admin/${id}`, true),

  /** Dev — simuler succès (environnement de test) */
  devComplete: (paymentId: string) =>
    post<{ ok: boolean; paymentId: string; status: string }>(
      `/payments/dev/complete/${paymentId}`,
      {},
    ),
};
