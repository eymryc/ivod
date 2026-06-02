import { api } from '../client';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface UserPreferences {
  emailMarketing: boolean;
  emailNotifications: boolean;
}

export const userApi = {
  me: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me'),

  update: (data: { firstName: string; lastName: string; avatarUrl?: string }): Promise<UserProfile> =>
    api.put<UserProfile>('/users/me', data),

  getPreferences: (): Promise<UserPreferences> =>
    api.get<UserPreferences>('/users/me/preferences'),

  updatePreferences: (data: UserPreferences): Promise<void> =>
    api.patch('/users/me/preferences', data),

  requestDataExport: (): Promise<{ message: string }> =>
    api.post<{ message: string }>('/users/me/export-data'),

  deleteAccount: (): Promise<{ message: string }> =>
    api.delete<{ message: string }>('/users/me'),
};
