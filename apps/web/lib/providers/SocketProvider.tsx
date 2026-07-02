"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "../socket";
import { readAccessTokenCookie } from "@/lib/auth/session";
import { isJwtExpired } from "@/lib/auth/jwt";
import { refreshAccessToken } from "@/lib/api/client";
import { useAuthStore } from "../stores/auth.store";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useUIStore } from "../stores/ui.store";

const SocketContext = createContext<Socket | null>(null);

function AppInit() {
  usePushNotifications();

  const { detectedCountry, setDetectedCountry } = useUIStore();
  useEffect(() => {
    if (detectedCountry) return;
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => { if (d.country_code) setDetectedCountry(d.country_code); })
      .catch(() => setDetectedCountry("CI"));
  }, [detectedCountry, setDetectedCountry]);

  return null;
}

async function resolveAccessToken(
  accessToken: string | null,
): Promise<string | null> {
  let token = accessToken ?? readAccessTokenCookie();
  if (!token) return null;
  if (isJwtExpired(token)) {
    token = await refreshAccessToken();
  }
  return token;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [connectedSocket, setConnectedSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bind() {
      if (!isAuthenticated) {
        disconnectSocket();
        setConnectedSocket(null);
        return;
      }

      const token = await resolveAccessToken(accessToken);
      if (cancelled) return;

      if (!token) {
        disconnectSocket();
        setConnectedSocket(null);
        return;
      }

      const s = connectSocket(token);

      const onConnect = () => {
        if (!cancelled) setConnectedSocket(s);
      };

      const onDisconnect = () => {
        if (!cancelled) setConnectedSocket(null);
      };

      const onConnectError = async () => {
        const refreshed = await refreshAccessToken();
        if (cancelled) return;
        if (refreshed) {
          connectSocket(refreshed);
          return;
        }
        disconnectSocket();
        setConnectedSocket(null);
      };

      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.on("connect", onConnect);
      s.on("disconnect", onDisconnect);
      s.on("connect_error", onConnectError);

      if (s.connected) {
        onConnect();
      }
    }

    bind();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={isAuthenticated && connectedSocket?.connected ? connectedSocket : null}
    >
      <AppInit />
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
