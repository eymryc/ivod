import { io, Socket } from "socket.io-client";
import { WS_URL } from "./config/api";

let socket: Socket | null = null;

/** Namespace Socket.IO aligné sur NotificationsGateway (`/notifications`). */
function notificationsNamespaceUrl(): string {
  const base = WS_URL.replace(/\/$/, "");
  return `${base}/notifications`;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(notificationsNamespaceUrl(), {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function connectSocket(token: string): Socket {
  const s = getSocket();
  s.auth = { token };
  if (s.connected) {
    s.disconnect();
  }
  s.connect();
  return s;
}

export function disconnectSocket(): void {
  resetSocket();
}
