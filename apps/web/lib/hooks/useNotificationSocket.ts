"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NotificationType, NotificationWsEvent } from "@/core/entities/notifications";
import { useSocket } from "@/lib/providers/SocketProvider";

/** Payload client (sans userId — réservé serveur) */
export type NotificationSocketPayload = Omit<NotificationWsEvent, "userId">;

export type NotificationHandler = (event: NotificationSocketPayload) => void;

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
const CONTENT_MODERATION_TYPES = new Set(["CONTENT_APPROVED", "CONTENT_REJECTED", "CONTENT_ARCHIVED"]);

/**
 * Écoute l'événement Socket.IO `notification`, invalide le cache liste,
 * et délègue aux handlers optionnels par type.
 */
export function useNotificationSocket(
  handlers?: Partial<Record<NotificationType, NotificationHandler>>,
): void {
  const socket = useSocket();
  const qc = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket) return;

    const onNotification = (event: NotificationSocketPayload) => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      if (CONTENT_MODERATION_TYPES.has(event.type)) {
        const contentId = (event.data as { contentId?: string })?.contentId;
        qc.invalidateQueries({ queryKey: ["creator-contents"] });
        if (contentId) {
          qc.invalidateQueries({ queryKey: ["content", contentId] });
        }
      }

      const handler = handlersRef.current?.[event.type as NotificationType];
      handler?.(event);
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socket, qc]);
}
