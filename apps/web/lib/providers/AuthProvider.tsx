"use client";

import { useEffect } from "react";
import { syncSessionFromCookie } from "@/lib/auth/sync";
import { useAuthStore } from "@/lib/stores/auth.store";

/** Synchronise cookie JWT ↔ store Zustand au chargement de l'app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    syncSessionFromCookie();
    return useAuthStore.persist.onFinishHydration(() => {
      syncSessionFromCookie();
    });
  }, []);

  return children;
}
