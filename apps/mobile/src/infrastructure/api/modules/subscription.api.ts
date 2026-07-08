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

export interface PlanDetails {
  code?: string;
  label?: string;
  maxScreens?: number;
  hasAds?: boolean;
  videoQuality?: string;
}

export interface ActiveSubscription {
  id: string;
  planCode: string;
  plan?: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  planDetails?: PlanDetails;
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

  /** Historique des abonnements. */
  getHistory: (): Promise<unknown[]> =>
    api.get<unknown[]>('/subscriptions/me/history'),

  /** Souscrit à un plan (retourne une redirection si paiement requis). */
  subscribe: (data: {
    planCode: string;
    providerCode: string;
    email: string;
    phoneNumber?: string;
    callbackUrl?: string;
  }): Promise<{ payment?: { redirectUrl?: string; id?: string } }> =>
    api.post('/subscriptions', data),

  /** Annule l'abonnement en fin de période. */
  cancel: (id: string): Promise<void> =>
    api.patch(`/subscriptions/${id}/cancel`, { cancelAtPeriodEnd: true }),
};
