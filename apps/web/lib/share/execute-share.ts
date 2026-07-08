import { toast } from "@/lib/toast";
import type { SharePayload } from "@/lib/share/build-share-payload";

/** Partage natif web avec repli copie presse-papiers puis WhatsApp. */
export async function executeShare(payload: SharePayload): Promise<void> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.message,
        url: payload.url,
      });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload.message);
      toast.success("Lien copié dans le presse-papiers");
      return;
    } catch {
      /* fallback WhatsApp */
    }
  }

  window.open(
    `https://wa.me/?text=${encodeURIComponent(payload.message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
