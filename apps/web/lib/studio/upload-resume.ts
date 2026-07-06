/**
 * Persistance locale de la progression d'un upload multipart — permet de
 * reprendre un envoi interrompu (coupure réseau, onglet fermé, crash) sans
 * retransmettre les parties déjà confirmées par MinIO. Une session par
 * `resumeKey` (contentId ou episodeId) : reprendre un contenu écrase
 * automatiquement toute session précédente non aboutie pour ce même contenu.
 *
 * Sécurité de la reprise : une partie n'est marquée "done" qu'après réponse
 * 200 + ETag de MinIO (voir multipart-upload.ts) — jamais de façon optimiste.
 * Le pire cas d'une correspondance de fichier erronée est un re-upload
 * inutile de la partie (MinIO accepte le remplacement d'un numéro de partie),
 * jamais une corruption du fichier final.
 */

const STORAGE_PREFIX = "ivod:upload-resume:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export interface ResumableSession {
  resumeKey: string;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  assetId: string;
  uploadId: string;
  partSizeBytes: number;
  parts: Record<number, string>;
  updatedAt: number;
}

function storageKey(resumeKey: string): string {
  return `${STORAGE_PREFIX}${resumeKey}`;
}

function readRaw(resumeKey: string): ResumableSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(resumeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumableSession;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(storageKey(resumeKey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Session correspondant exactement au fichier sélectionné → reprise possible. */
export function loadResumableSession(resumeKey: string, file: File): ResumableSession | null {
  const session = readRaw(resumeKey);
  if (!session) return null;
  const matches =
    session.fileName === file.name &&
    session.fileSize === file.size &&
    session.fileLastModified === file.lastModified;
  return matches ? session : null;
}

/** Session existante quel que soit le fichier — pour afficher un indice avant sélection. */
export function peekResumableSession(
  resumeKey: string,
): { fileName: string; percent: number } | null {
  const session = readRaw(resumeKey);
  if (!session) return null;
  const totalParts = Math.max(1, Math.ceil(session.fileSize / session.partSizeBytes));
  const donePercent = Math.round((Object.keys(session.parts).length / totalParts) * 100);
  return { fileName: session.fileName, percent: donePercent };
}

export function saveResumableSession(session: ResumableSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(session.resumeKey), JSON.stringify(session));
  } catch {
    /* quota localStorage dépassé ou navigation privée — reprise simplement indisponible */
  }
}

export function markPartDone(resumeKey: string, partNumber: number, etag: string): void {
  if (typeof window === "undefined") return;
  const session = readRaw(resumeKey);
  if (!session) return;
  session.parts[partNumber] = etag;
  session.updatedAt = Date.now();
  saveResumableSession(session);
}

export function clearResumableSession(resumeKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(resumeKey));
}
