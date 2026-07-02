/** Types reconnus pour le surlignage navbar (?type= sur /content/:id). */
const NAV_CONTENT_TYPE_CODES = new Set([
  "FILM",
  "SERIE",
  "WEB_SERIE",
  "ANIMATION",
  "DOCUMENTAIRE",
]);

/** Lien fiche viewer — inclut le type pour activer le bon onglet nav. */
export function contentDetailHref(
  contentId: string,
  contentTypeCode?: string | null,
): string {
  const code = contentTypeCode?.trim().toUpperCase();
  if (code && NAV_CONTENT_TYPE_CODES.has(code)) {
    return `/content/${contentId}?type=${code}`;
  }
  return `/content/${contentId}`;
}

/** Code API → clé matchType navbar (FILM, SERIE, …). */
export function navMatchTypeFromContentType(
  contentTypeCode?: string | null,
): "FILM" | "SERIE" | "WEB_SERIE" | "ANIMATION" | null {
  const code = contentTypeCode?.trim().toUpperCase();
  if (code === "FILM") return "FILM";
  if (code === "SERIE") return "SERIE";
  if (code === "WEB_SERIE") return "WEB_SERIE";
  if (code === "ANIMATION") return "ANIMATION";
  return null;
}

/** Normalise le type de contenu (string API liste ou objet fiche détail). */
export function resolveContentTypeCode(content: {
  contentType?: string | { code?: string; label?: string } | null;
  contentTypeCode?: string | null;
}): string | null {
  if (content.contentTypeCode) return content.contentTypeCode;
  const ct = content.contentType;
  if (!ct) return null;
  if (typeof ct === "string") return ct;
  return ct.code ?? null;
}

export function resolveContentTypeLabel(content: {
  contentType?: string | { code?: string; label?: string } | null;
  contentTypeCode?: string | null;
  contentTypeLabel?: string | null;
}): string | null {
  if (content.contentTypeLabel) return content.contentTypeLabel;
  const ct = content.contentType;
  if (ct && typeof ct === "object" && ct.label) return ct.label;
  const code = resolveContentTypeCode(content);
  return code ? code.replace(/_/g, " ") : null;
}

export function isSeriesContentType(code: string | null | undefined): boolean {
  return code === "SERIE" || code === "WEB_SERIE";
}

/** Film, doc, court métrage, etc. — une vidéo au niveau du contenu. */
export function usesContentLevelVideo(code: string | null | undefined): boolean {
  return !isSeriesContentType(code);
}

export function studioStructureHref(contentId: string): string {
  return `/studio/contents/${contentId}?tab=structure`;
}

/** Label du bouton d'upload selon l'état vidéo et le libellé du type (vient de la BDD). */
export function uploadButtonLabel(
  isPlayable: boolean,
  isEncoding: boolean,
  contentTypeLabel?: string | null,
): string {
  if (isEncoding) return "Encodage…";
  if (isPlayable) return "Voir la vidéo";
  if (contentTypeLabel) return `Uploader · ${contentTypeLabel}`;
  return "Uploader la vidéo";
}
