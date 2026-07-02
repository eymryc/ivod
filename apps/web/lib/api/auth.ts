import { get, post } from "./client";

export const authApi = {
  sendOtp: (email: string) =>
    post("/auth/send-otp", { email }, false),

  verifyOtp: (email: string, otp: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>("/auth/verify-otp", { email, otp }, false),

  login: (data: { email?: string; phone?: string; password: string }) =>
    post<{ accessToken: string; refreshToken: string; user: any }>("/auth/login", data, false),

  register: (data: { email?: string; phone?: string; firstName: string; lastName: string; password: string }) =>
    post<{ accessToken: string; refreshToken: string; user: any }>("/auth/register", data, false),

  refresh: (refreshToken: string) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken }, false),

  forgotPassword: (email: string) =>
    post("/auth/forgot-password", { email }, false),

  resetPassword: (data: { email: string; token: string; newPassword: string }) =>
    post("/auth/reset-password", data, false),

  verifySetupToken: (token: string) =>
    get<{ valid: boolean; email?: string }>(`/auth/setup-password?token=${encodeURIComponent(token)}`, false),

  setupPassword: (data: { token: string; newPassword: string }) =>
    post("/auth/setup-password", data, false),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    post("/auth/change-password", data),

  me: () => get<any>("/users/me", true),
};
