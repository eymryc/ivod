import { get, post, patch } from "./client";

export const subscriptionsApi = {
  getPlans: () => get<any[]>("/subscriptions/plans"),
  getAllPlans: () => get<any[]>("/subscriptions/plans?includeFree=true"),
  getActive: () => get<any>("/subscriptions/me", true),
  getHistory: () => get<any[]>("/subscriptions/me/history", true),
  subscribe: (data: {
    planCode: string;
    providerCode: string;
    email: string;
    phoneNumber?: string;
  }) => post<any>("/subscriptions", data),
  cancel: (id: string, data: { cancelAtPeriodEnd: boolean }) =>
    patch<any>(`/subscriptions/${id}/cancel`, data),
};
