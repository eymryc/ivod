/**
 * Module API — Signalements de contenu.
 */

import { api } from '../client';

export const reportApi = {
  /** Signale un contenu pour une raison donnée. */
  reportContent: (
    contentId: string,
    reason: string,
    description?: string,
  ): Promise<void> =>
    api.post(`/reports/contents/${contentId}`, { reason, description }),
};
