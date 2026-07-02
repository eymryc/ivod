const QUALITY_LABELS: Record<string, string> = {
  "480p": "SD",
  "720p": "HD",
  "1080p": "FHD",
};

export function qualityShortLabel(quality?: string): string | undefined {
  if (!quality) return undefined;
  return QUALITY_LABELS[quality] ?? quality.toUpperCase();
}

export function formatExpiryChip(expiresAt?: string, now = Date.now()): {
  label: string;
  urgent: boolean;
  expired: boolean;
} | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0) return { label: "Expiré", urgent: true, expired: true };
  if (days === 0) return { label: "Expire aujourd'hui", urgent: true, expired: false };
  if (days === 1) return { label: "Expire demain", urgent: true, expired: false };
  if (days <= 7) return { label: `${days} j restants`, urgent: true, expired: false };
  if (days <= 30) return { label: `${days} j restants`, urgent: false, expired: false };
  return {
    label: new Date(expiresAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }),
    urgent: false,
    expired: false,
  };
}

export function buildDownloadMeta(opts: {
  quality?: string;
  expiresAt?: string;
  offline?: boolean;
}): string | undefined {
  const parts = [
    qualityShortLabel(opts.quality),
    opts.offline ? "Sur l'appareil" : null,
    formatExpiryChip(opts.expiresAt)?.label ?? null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
