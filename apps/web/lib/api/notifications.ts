import { get, put } from "./client";

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    get<any>(`/notifications?page=${page}&limit=${limit}`, true),
  markRead: (id: string) => put<any>(`/notifications/${id}/read`),
  markAllRead: () => put<any>("/notifications/read-all"),
};
