import { get, post, del } from "./client";

export const followsApi = {
  list: () => get<any[]>("/follows", true),
  status: (creatorId: string) => get<{ following: boolean }>(`/follows/${creatorId}/status`, true),
  follow: (creatorId: string) => post<any>(`/follows/${creatorId}`),
  unfollow: (creatorId: string) => del<any>(`/follows/${creatorId}`),
};
