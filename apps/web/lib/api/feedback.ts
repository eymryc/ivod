import { toast } from "@/lib/toast";
import { ApiError } from "./client";

/** Message utilisateur renvoyé par l'API (`data.message` ou corps d'erreur). */
export function extractApiMessage(payload: unknown): string | undefined {
  if (payload == null) return undefined;
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (typeof payload !== "object") return undefined;

  const obj = payload as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message.trim();
  }
  if (obj.data && typeof obj.data === "object") {
    return extractApiMessage(obj.data);
  }
  return undefined;
}

/** Message d'erreur issu de l'API (jamais de texte inventé côté front). */
export function getApiErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    const msg = error.message?.trim();
    return msg || undefined;
  }
  return undefined;
}

export function showApiError(error: unknown): void {
  const message = getApiErrorMessage(error);
  if (message) toast.error(message, { title: "Erreur" });
}

export function showApiSuccess(data?: unknown): void {
  const message = extractApiMessage(data);
  if (message) toast.success(message, { title: "Succès" });
}

/** Toast depuis une notification WebSocket (title/body émis par l'API). */
export function showNotificationMessage(
  event: { title?: string; body?: string },
  variant: "success" | "error" = "success",
): void {
  const message = event.body?.trim() || event.title?.trim();
  if (!message) return;
  if (variant === "error") toast.error(message, { title: "Erreur" });
  else toast.success(message, { title: "Notification" });
}
