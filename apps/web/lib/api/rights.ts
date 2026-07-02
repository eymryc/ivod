import { del, get, patch, post } from "./client";

export type RightsContract = {
  id: string;
  rightsholderId: string;
  distributorId?: string | null;
  contractRef?: string | null;
  signedAt?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isExclusive?: boolean;
  revenueSharePct?: number | null;
  notes?: string | null;
  rightsholder?: { id: string; displayName: string; type?: { code: string; label: string } };
  distributor?: { id: string; displayName: string } | null;
  _count?: { contentRights: number };
};

export type ContentRight = {
  id: string;
  contentId: string;
  contractId: string;
  startsAt: string;
  endsAt?: string | null;
  content?: { id: string; title: string };
  monetizationType?: { code: string; label: string };
  territoryCode?: { code: string; label: string };
  status?: { code: string; label: string };
  contract?: {
    id: string;
    contractRef?: string | null;
    revenueSharePct?: number | null;
    rightsholder?: { displayName: string };
  };
};

export const rightsApi = {
  listContracts: () => get<RightsContract[]>("/rights/contracts", true),

  createContract: (data: {
    rightsholderId: string;
    distributorId?: string;
    contractRef?: string;
    startsAt: string;
    endsAt?: string;
    revenueSharePct?: number;
    isExclusive?: boolean;
    notes?: string;
  }) => post<RightsContract & { message?: string }>("/rights/contracts", data),

  updateContract: (
    id: string,
    data: Partial<{
      rightsholderId: string;
      distributorId: string | null;
      contractRef: string;
      startsAt: string;
      endsAt: string | null;
      revenueSharePct: number;
      isExclusive: boolean;
      notes: string;
    }>,
  ) => patch<RightsContract & { message?: string }>(`/rights/contracts/${id}`, data),

  removeContract: (id: string) => del<{ message?: string }>(`/rights/contracts/${id}`),

  listContentRights: (contentId?: string) => {
    const q = contentId ? `?contentId=${encodeURIComponent(contentId)}` : "";
    return get<ContentRight[]>(`/rights/content-rights${q}`, true);
  },

  createContentRight: (data: {
    contentId: string;
    contractId: string;
    monetizationType: string;
    territoryCode: string;
    status: string;
    startsAt: string;
    endsAt?: string;
  }) => post<ContentRight & { message?: string }>("/rights/content-rights", data),

  updateContentRight: (
    id: string,
    data: Partial<{
      monetizationType: string;
      territoryCode: string;
      status: string;
      startsAt: string;
      endsAt: string | null;
    }>,
  ) => patch<ContentRight & { message?: string }>(`/rights/content-rights/${id}`, data),

  removeContentRight: (id: string) =>
    del<{ message?: string }>(`/rights/content-rights/${id}`),
};
