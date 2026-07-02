/**
 * Module API — Notifications.
 */

import { api, buildQueryString } from '../client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export const notificationApi = {
  /** Liste les notifications de l'utilisateur. */
  list: (page = 1): Promise<Notification[]> =>
    api.get<Notification[]>(`/notifications${buildQueryString({ page, limit: 30 })}`),

  /** Marque une notification comme lue. */
  markRead: (id: string): Promise<void> =>
    api.put(`/notifications/${id}/read`),

  /** Marque toutes les notifications comme lues. */
  markAllRead: (): Promise<void> =>
    api.put('/notifications/read-all'),
};
