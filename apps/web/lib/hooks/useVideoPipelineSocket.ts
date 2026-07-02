"use client";

import { useCallback } from "react";
import { showNotificationMessage } from "@/lib/api/feedback";
import { NotificationType } from "@/core/entities/notifications";
import {
  useNotificationSocket,
  type NotificationSocketPayload,
} from "./useNotificationSocket";

interface VideoPipelineSocketOptions {
  contentId?: string;
  episodeId?: string;
  onPreviewReady?: () => void;
  onReady?: () => void;
  onFailed?: () => void;
}

function matchesScope(
  data: Record<string, unknown>,
  contentId?: string,
  episodeId?: string,
): boolean {
  if (episodeId) return data.episodeId === episodeId;
  if (contentId) return data.contentId === contentId && !data.episodeId;
  return false;
}

/**
 * Handlers WebSocket dédiés au pipeline vidéo studio (preview / ready / failed).
 */
export function useVideoPipelineSocket({
  contentId,
  episodeId,
  onPreviewReady,
  onReady,
  onFailed,
}: VideoPipelineSocketOptions): void {
  const handle = useCallback(
    (
      event: NotificationSocketPayload,
      cb?: () => void,
      variant: "success" | "error" = "success",
    ) => {
      if (!matchesScope(event.data as Record<string, unknown>, contentId, episodeId)) return;
      cb?.();
      showNotificationMessage(event, variant);
    },
    [contentId, episodeId],
  );

  useNotificationSocket({
    [NotificationType.VIDEO_PREVIEW_READY]: (e) => handle(e, onPreviewReady),
    [NotificationType.VIDEO_READY]: (e) => handle(e, onReady),
    [NotificationType.VIDEO_FAILED]: (e) => handle(e, onFailed, "error"),
  });
}
