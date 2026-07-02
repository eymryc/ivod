import { get, post, del } from "./client";

export const devicesApi = {
  list: () => get<any[]>("/devices", true),
  register: (data: { deviceType: string; deviceName?: string; os?: string; osVersion?: string; fingerprint?: string }) =>
    post<any>("/devices", data),
  revoke: (id: string) => del<any>(`/devices/${id}`),
  registerPushToken: (id: string, token: string, platform: "ANDROID" | "IOS" | "WEB") =>
    post<any>(`/devices/${id}/push-token`, { token, platform }),
  getLoginHistory: () => get<any[]>("/devices/login-history", true),
};
