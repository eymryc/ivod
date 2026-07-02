import { get, post } from "./client";

export interface AdConfig {
  id: string;
  type: "video" | "image" | "html";
  url: string;
  link?: string;
  duration?: number;
  skipAfter?: number;
}

export const adsApi = {
  // GET /ads/next — prochaine pub pour l'utilisateur connecté (null si abonné payant)
  getNext: () =>
    get<AdConfig | null>("/ads/next", true).catch(() => null),

  // POST /ads/:adId/impression — tracker affichage ou clic
  recordImpression: (adId: string, clicked = false) =>
    post<void>(`/ads/${adId}/impression`, { clicked }, true).catch(() => {}),
};
