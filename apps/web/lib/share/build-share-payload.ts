/**
 * Construction des liens et messages de partage iVOD (web).
 *
 * Règle produit : une seule URL HTTPS canonique par partage.
 * - Découverte → /content/{id}
 * - Reprise (session active) → /watch/{id}?ep=…&t=…
 */

export interface ShareResumeInput {
  episodeId?: string | null;
  watchedSeconds?: number;
  completed?: boolean;
}

export interface SharePayload {
  title: string;
  message: string;
  url: string;
}

export function getShareWebBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://ivod.africa").replace(/\/$/, "");
}

export function buildContentShareUrl(baseUrl: string, contentId: string): string {
  return `${baseUrl}/content/${contentId}`;
}

export function buildResumeShareUrl(
  baseUrl: string,
  contentId: string,
  resume: ShareResumeInput,
): string {
  const params = new URLSearchParams();
  if (resume.episodeId) params.set("ep", resume.episodeId);
  const t = Math.floor(resume.watchedSeconds ?? 0);
  if (t > 0) params.set("t", String(t));
  const q = params.toString();
  return `${baseUrl}/watch/${contentId}${q ? `?${q}` : ""}`;
}

export function buildSharePayload(opts: {
  contentId: string;
  title: string;
  resume?: ShareResumeInput | null;
  webBaseUrl?: string;
}): SharePayload {
  const base = (opts.webBaseUrl ?? getShareWebBaseUrl()).replace(/\/$/, "");
  const title = opts.title.trim() || "Contenu iVOD";

  if (opts.resume && !opts.resume.completed) {
    const url = buildResumeShareUrl(base, opts.contentId, opts.resume);
    return {
      title,
      url,
      message: `Je regarde « ${title} » sur iVOD\n${url}`,
    };
  }

  const url = buildContentShareUrl(base, opts.contentId);
  return {
    title,
    url,
    message: `Découvre « ${title} » sur iVOD\n${url}`,
  };
}
