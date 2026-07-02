import { del, get, patch, post } from "./client";

export type Rightsholder = {
  id: string;
  displayName: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  isVerified?: boolean;
  type?: { code: string; label: string };
  country?: { isoCode: string; label: string } | null;
  createdAt?: string;
};

export const rightsholdersApi = {
  list: () => get<Rightsholder[]>("/rightsholders", true),

  getOne: (id: string) => get<Rightsholder>(`/rightsholders/${id}`, true),

  create: (data: {
    type: string;
    displayName: string;
    legalName?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    isVerified?: boolean;
  }) => post<Rightsholder & { message?: string }>("/rightsholders", data),

  update: (
    id: string,
    data: Partial<{
      type: string;
      displayName: string;
      legalName: string;
      email: string;
      phone: string;
      countryCode: string;
      isVerified: boolean;
    }>,
  ) => patch<Rightsholder & { message?: string }>(`/rightsholders/${id}`, data),

  remove: (id: string) => del<{ message?: string }>(`/rightsholders/${id}`),
};

/** Alias historique */
export const rightholdersApi = rightsholdersApi;
