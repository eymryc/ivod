/**
 * Module API — Paiements & Remboursements.
 */

import { api, buildQueryString } from '../client';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

export interface PaymentListResult {
  items: Payment[];
  total?: number;
}

export type PaystackConfig = {
  publicKey: string;
  currency: string;
  configured?: boolean;
  secretKeyInvalid?: boolean;
  simulationMode?: boolean;
  simulationAllowed?: boolean;
};

export const paymentApi = {
  /** Configuration publique (aligné web). */
  getPaystackConfig: (): Promise<PaystackConfig> =>
    api.get<PaystackConfig>("/payments/config/paystack", false),

  /** Configuration publique d'un provider de paiement (ex. PAYSTACK). */
  getProviderConfig: (provider: string): Promise<{ publicKey: string; configured: boolean }> =>
    api.get(`/payments/config/${provider}`, false),

  /** Liste les paiements de l'utilisateur. */
  list: (page = 1, limit = 20): Promise<PaymentListResult> =>
    api.get<PaymentListResult>(`/payments${buildQueryString({ page, limit })}`),

  /** Force la synchronisation d'un paiement avec le provider. */
  sync: (paymentId: string): Promise<void> =>
    api.post(`/payments/${paymentId}/sync`, {}),

  syncPayment: (paymentId: string): Promise<void> =>
    api.post(`/payments/${paymentId}/sync`, {}),

  /** Dev — simuler succès (environnement de test) */
  devComplete: (paymentId: string): Promise<{ ok: boolean; paymentId: string; status: string }> =>
    api.post(`/payments/dev/complete/${paymentId}`, {}),

  getOne: (paymentId: string): Promise<Payment> =>
    api.get<Payment>(`/payments/${paymentId}`),

  initiatePayment: (data: {
    amount: number;
    providerCode: string;
    email?: string;
    phoneNumber?: string;
    planCode?: string;
    contentId?: string;
    userSubscriptionId?: string;
    callbackUrl?: string;
  }): Promise<{ paymentId?: string; id?: string; redirectUrl?: string; payment?: Payment }> =>
    api.post('/payments/initiate', data),

  getInvoices: (page = 1): Promise<{ items: unknown[] } | unknown[]> =>
    api.get(`/invoices?page=${page}`),

  /** Liste les remboursements de l'utilisateur. */
  getRefunds: (): Promise<unknown[]> =>
    api.get<unknown[]>('/refunds'),

  /** Demande un remboursement pour un paiement. */
  requestRefund: (paymentId: string, reason?: string): Promise<void> =>
    api.post(`/refunds/${paymentId}`, { reason }),
};
