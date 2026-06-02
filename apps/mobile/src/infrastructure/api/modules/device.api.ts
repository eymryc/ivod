/**
 * Module API — Appareils enregistrés.
 * Gestion des appareils liés au compte et des tokens push.
 */

import { api, buildQueryString } from '../client';

export interface RegisteredDevice {
  id: string;
  deviceType: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
  appVersion?: string;
  fingerprint?: string;
  createdAt?: string;
}

export interface LoginHistoryResult {
  items: unknown[];
  total: number;
}

export const deviceApi = {
  /** Liste les appareils liés au compte. */
  list: (): Promise<RegisteredDevice[]> =>
    api.get<RegisteredDevice[]>('/devices'),

  /**
   * Enregistre l'appareil courant côté API.
   * Idempotent : basé sur le fingerprint.
   */
  register: (data: {
    deviceType: string;
    deviceName?: string;
    os?: string;
    osVersion?: string;
    appVersion?: string;
    fingerprint?: string;
  }): Promise<RegisteredDevice> =>
    api.post<RegisteredDevice>('/devices', data),

  /** Associe un token push Expo à un appareil enregistré. */
  registerPushToken: (
    deviceId: string,
    token: string,
    platform: 'IOS' | 'ANDROID',
  ): Promise<void> =>
    api.post(`/devices/${deviceId}/push-token`, { token, platform }),

  /** Retire un appareil du compte. */
  remove: (id: string): Promise<void> =>
    api.delete(`/devices/${id}`),

  /** Historique des connexions paginé. */
  getLoginHistory: (page = 1, limit = 30): Promise<LoginHistoryResult> =>
    api.get<LoginHistoryResult>(
      `/devices/login-history${buildQueryString({ page, limit })}`,
    ),
};
