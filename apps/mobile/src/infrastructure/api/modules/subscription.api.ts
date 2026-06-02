/**
 * Module API — Abonnements & Plans.
 */

import { api } from '../client';

export interface SubscriptionPlan {
  code: string;
  name: string;
  price: number;
  currency: string;
  features?: string[];
}

export interface ActiveSubscription {
  id: string;
  planCode: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export const subscriptionApi = {
  /** Liste les plans d'abonnement disponibles (public). */
  getPlans: (): Promise<SubscriptionPlan[]> =>
    api.get<SubscriptionPlan[]>('/subscriptions/plans', false),

  /** Liste tous les plans y compris FREE (pour l'affichage tarifaire). */
  getAllPlans: (): Promise<SubscriptionPlan[]> =>
    api.get<SubscriptionPlan[]>('/subscriptions/plans?includeFree=true', false),

  /** Récupère l'abonnement actif de l'utilisateur. */
  getActive: (): Promise<ActiveSubscription | null> =>
    api.get<ActiveSubscription | null>('/subscriptions/me'),

  /** Souscrit à un plan. */
  subscribe: (data: {
    planCode: string;
    providerCode: string;
    email: string;
    phoneNumber?: string;
  }): Promise<void> =>
    api.post('/subscriptions', data),

  /** Annule l'abonnement en fin de période. */
  cancel: (id: string): Promise<void> =>
    api.patch(`/subscriptions/${id}/cancel`, { cancelAtPeriodEnd: true }),
};
