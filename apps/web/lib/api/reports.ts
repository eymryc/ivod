import { post } from "./client";

export type ReportReason = "INAPPROPRIATE" | "SPAM" | "COPYRIGHT" | "MISINFORMATION" | "OTHER";

export const reportsApi = {
  reportContent: (contentId: string, reason: ReportReason, description?: string) =>
    post<any>(`/reports/contents/${contentId}`, { reason, description }),
};
