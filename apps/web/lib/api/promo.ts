import { get } from "./client";
import type { PromoStreamResponse, PromoVideosBundle } from "@/core/entities/promo.entity";

export const promoApi = {
  getBundle: (contentId: string, locale?: string) =>
    get<PromoVideosBundle & { preferTeaser?: boolean }>(
      `/contents/${contentId}/promo${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`,
      "optional",
    ),

  getStream: (assetId: string) =>
    get<PromoStreamResponse>(`/media-assets/${assetId}/promo-stream`, "optional"),
};
