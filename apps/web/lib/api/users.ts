import { del, get, patch, post, put } from "./client";

export type UpdateUserProfilePayload = {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
};

export type UserPreferences = {
  emailMarketing: boolean;
  emailNotifications: boolean;
};

export const usersApi = {
  me: () => get<any>("/users/me", true),
  updateProfile: (data: UpdateUserProfilePayload) =>
    put<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      name: string;
      avatarUrl?: string | null;
    }>("/users/me", data),
  getPreferences: () => get<UserPreferences>("/users/me/preferences", true),
  updatePreferences: (data: UserPreferences) =>
    patch<UserPreferences>("/users/me/preferences", data),
  requestDataExport: () => post<{ message: string }>("/users/me/export-data"),
  deleteAccount: () => del<{ message: string }>("/users/me"),
};
