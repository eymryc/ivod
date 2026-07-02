import { get, post, patch, del } from "./client";

export type PersonSummary = { id: string; fullName?: string; stageName?: string | null };

export type PersonDetail = {
  id: string;
  fullName: string;
  stageName?: string | null;
  avatarObjectKey?: string | null;
  nationality?: string | null;
  birthDate?: string | null;
  biography?: string | null;
  castAppearances?: any[];
  crewAppearances?: any[];
  cast?: any[];
  crew?: any[];
};

export type CreatePersonInput = {
  fullName: string;
  stageName?: string;
  biography?: string;
  birthDate?: string;
  nationality?: string;
};

export type AddCastInput = {
  personId: string;
  characterName?: string;
  displayOrder?: number;
  isMainCast?: boolean;
};

export type UpdateCastInput = {
  characterName?: string;
  displayOrder?: number;
  isMainCast?: boolean;
};

export const peopleApi = {
  search: async (q: string, limit = 15): Promise<PersonSummary[]> => {
    const res = await get<{ items?: PersonSummary[] }>(
      `/people?search=${encodeURIComponent(q)}&limit=${limit}`,
      true,
    );
    return res?.items ?? [];
  },

  getOne: (id: string) => get<PersonDetail>(`/people/${id}`),

  create: (data: CreatePersonInput) => post<PersonSummary>("/people", data),

  update: (id: string, data: Partial<CreatePersonInput>) =>
    patch<PersonSummary>(`/people/${id}`, data),

  getCast: (contentId: string) => get<CastRow[]>(`/people/contents/${contentId}/cast`, true),

  addCast: (contentId: string, data: AddCastInput) =>
    post<CastRow>(`/people/contents/${contentId}/cast`, data),

  updateCast: (castId: string, data: UpdateCastInput) =>
    patch<CastRow>(`/people/cast/${castId}`, data),

  removeCast: (castId: string) => del<{ message?: string }>(`/people/cast/${castId}`),

  getCrew: (contentId: string) => get<CrewRow[]>(`/people/contents/${contentId}/crew`, true),

  addCrew: (contentId: string, data: { personId: string; crewRoleId: string }) =>
    post<CrewRow>(`/people/contents/${contentId}/crew`, data),

  updateCrew: (crewId: string, data: { crewRoleId: string }) =>
    patch<CrewRow>(`/people/crew/${crewId}`, data),

  removeCrew: (crewId: string) => del<{ message?: string }>(`/people/crew/${crewId}`),
};

export type CastRow = {
  id: string;
  characterName?: string | null;
  displayOrder?: number;
  isMainCast?: boolean;
  person?: { id: string; fullName?: string; stageName?: string | null };
};

export type CrewRow = {
  id: string;
  person?: { id: string; fullName?: string; stageName?: string | null };
  crewRole?: { id?: string; code?: string; label?: string };
};
