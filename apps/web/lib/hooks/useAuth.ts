"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { useAuthStore } from "../stores/auth.store";
import { useProfileStore } from "../stores/profile.store";
import { authApi } from "../api/auth";
import { devicesApi } from "../api/devices";
import { profilesApi } from "../api/profiles";
import { ApiError } from "../api/client";

function getOrCreateDeviceFingerprint(): string {
  const key = "ivod-device-fp";
  try {
    let fp = localStorage.getItem(key);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(key, fp);
    }
    return fp;
  } catch {
    return `web-${navigator.userAgent.slice(0, 48)}`;
  }
}

/** Enregistre ou met à jour l'appareil courant (navigateur) — idempotent via fingerprint. */
export function registerCurrentDevice() {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  const deviceType = isTablet ? "TABLET" : isMobile ? "MOBILE" : "WEB";

  return devicesApi
    .register({
      deviceType,
      deviceName: `${navigator.platform ?? "Web"} · ${navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : navigator.userAgent.includes("Safari") ? "Safari" : "Navigateur"}`,
      os: navigator.platform ?? undefined,
      fingerprint: getOrCreateDeviceFingerprint(),
    })
    .catch(() => { /* silencieux — non bloquant */ });
}

function registerDevice() {
  registerCurrentDevice();
}

export function useAuth() {
  const { user, isAuthenticated, login, logout, accessToken } = useAuthStore();
  const { clearProfiles } = useProfileStore();
  const router = useRouter();
  const qc = useQueryClient();

  const onLoginSuccess = async (data: any) => {
    login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
    showApiSuccess(data);
    registerDevice();

    // Redirection selon le rôle
    const roles: string[] = data.user?.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) {
      router.push("/admin");
      return;
    }
    if (roles.includes("CREATOR")) {
      router.push("/studio");
      return;
    }

    // VIEWER — auto-sélectionner le profil si un seul existe
    try {
      const profiles = await profilesApi.list();
      if (profiles.length === 1) {
        const { setActiveProfile, setProfiles } = useProfileStore.getState();
        setProfiles(profiles);
        setActiveProfile(profiles[0].id);
        router.push("/");
        return;
      }
    } catch {
      // non-blocking — fall through to /profiles
    }
    router.push("/profiles");
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: onLoginSuccess,
    onError: (err: ApiError) => showApiError(err),
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: any) => {
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      showApiSuccess(data);
      registerDevice();
      let pendingPlan: string | null = null;
      try {
        pendingPlan = sessionStorage.getItem("ivod-pending-plan");
        if (pendingPlan) sessionStorage.removeItem("ivod-pending-plan");
      } catch {
        /* ignore */
      }
      if (pendingPlan) {
        router.push(`/settings/subscription?plan=${encodeURIComponent(pendingPlan)}`);
        return;
      }
      // New account → no profiles yet, go straight to profile creation
      router.push("/profiles");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) => authApi.verifyOtp(email, otp),
    onSuccess: onLoginSuccess,
    onError: (err: ApiError) => showApiError(err),
  });

  const sendOtpMutation = useMutation({
    mutationFn: (email: string) => authApi.sendOtp(email),
    onSuccess: (data) => showApiSuccess(data),
    onError: (err: ApiError) => showApiError(err),
  });

  const handleLogout = useCallback(() => {
    logout();
    clearProfiles();
    qc.clear();
    router.push("/auth/login");
  }, [logout, clearProfiles, qc, router]);

  return {
    user,
    isAuthenticated,
    accessToken,
    loginMutation,
    registerMutation,
    verifyOtpMutation,
    sendOtpMutation,
    logout: handleLogout,
    onLoginSuccess,
  };
}
