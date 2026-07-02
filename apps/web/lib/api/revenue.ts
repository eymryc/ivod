import { buildQueryString, get, post, patch } from "./client";

export const revenueApi = {
  getMyStatements: (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    return get<any>(`/revenue/me/statements?${params}`, true);
  },

  getAllStatements: (params?: { status?: string; page?: number }) =>
    get<any>(`/revenue/statements${buildQueryString(params)}`, true),
  calculateRevenue: (year: number, month: number) =>
    post<any>(`/revenue/calculate/${year}/${month}`),
  payStatement: (id: string) =>
    patch<any>(`/revenue/statements/${id}/pay`),
};
