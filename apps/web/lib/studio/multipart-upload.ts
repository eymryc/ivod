import axios from "axios";
import {
  loadResumableSession,
  saveResumableSession,
  markPartDone,
  clearResumableSession,
} from "./upload-resume";

/**
 * Upload multipart parallèle (S3/MinIO) — plusieurs morceaux du fichier
 * envoyés simultanément sur des connexions réseau distinctes, plutôt qu'un
 * seul PUT séquentiel. Sur une connexion à latence élevée (utilisateur loin
 * du serveur), une seule connexion TCP plafonne bien en-dessous de la bande
 * passante réelle disponible — paralléliser sur plusieurs connexions permet
 * de l'exploiter, comme le fait un test de vitesse (speedtest.net, fast.com).
 *
 * Reprise sur coupure : chaque partie confirmée (ETag reçu) est persistée
 * dans localStorage (voir upload-resume.ts) sous `resumeKey`. Si la même
 * fonction est rappelée avec le même fichier (nom/taille/date de modif
 * identiques) avant que l'upload précédent ait abouti, les parties déjà
 * envoyées sont sautées au lieu d'être retransmises depuis zéro.
 *
 * Concurrence adaptative : `getPartUrl` est un petit appel JSON (corps
 * négligeable) — sa durée approxime le RTT courant. Si elle explose alors
 * que des PUT de parties tournent en parallèle, c'est le signe d'un
 * bufferbloat côté client (la box met les paquets en file d'attente plutôt
 * que de les rejeter) : on réduit alors le nombre de flux simultanés pour
 * laisser respirer la connexion, plutôt que d'insister sur 5 flux qui se
 * marchent dessus. On remonte progressivement si la latence redevient
 * normale.
 *
 * Retry par partie : un gros fichier découpé en centaines/milliers de
 * parties, chacune est un point de défaillance possible sur une connexion
 * instable — sans retry, une seule coupure transitoire tuait tout l'upload
 * après des heures de transfert. Chaque partie retente jusqu'à
 * PART_MAX_ATTEMPTS fois avec un délai croissant avant d'abandonner pour de
 * bon (auquel cas la reprise sur coupure prend le relais).
 */

const MAX_CONCURRENCY = 5;
const MIN_CONCURRENCY = 1;
const LATENCY_SPIKE_FACTOR = 3;
const LATENCY_RECOVERY_FACTOR = 1.5;
const SPIKE_STREAK_TO_THROTTLE = 3;
const RECOVERY_STREAK_TO_RESTORE = 6;

const SLOW_UPLOAD_TOTAL_THRESHOLD_MS = 3 * 60 * 1000; // au-delà, on avertit le créateur
const SLOW_UPLOAD_MIN_SAMPLE_MS = 4000; // échantillon minimal avant d'estimer un débit fiable
const SLOW_UPLOAD_STATS_THROTTLE_MS = 3000; // fréquence de rafraîchissement de l'estimation affichée

const PART_MAX_ATTEMPTS = 5;
const PART_RETRY_BASE_DELAY_MS = 1000;
const PART_RETRY_MAX_DELAY_MS = 20_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SlowUploadInfo {
  throughputMbps: number;
  etaSeconds: number;
}

export interface MultipartUploadCallbacks {
  onProgress?: (percent: number) => void;
  /** Émis une seule fois (pour le toast) si le débit mesuré laisse présager plus de 3 minutes d'envoi. */
  onSlowUploadDetected?: (info: SlowUploadInfo) => void;
  /** Émis en continu (throttlé) une fois l'upload identifié comme lent — rafraîchit débit/ETA affichés. */
  onUploadStatsUpdate?: (info: SlowUploadInfo) => void;
  /** Émis à chaque changement du nombre de connexions parallèles actives. */
  onConcurrencyChange?: (current: number, max: number) => void;
  /** Émis à chaque nouvelle tentative après l'échec d'une partie (réseau, timeout...). */
  onPartRetry?: (partNumber: number, attempt: number, maxAttempts: number) => void;
}

export interface MultipartUploadHandlers {
  initMultipart: (
    mimeType?: string,
    fileSizeBytes?: number,
  ) => Promise<{
    assetId: string;
    uploadId: string;
    partSizeBytes: number;
  }>;
  getPartUrl: (
    assetId: string,
    uploadId: string,
    partNumber: number,
  ) => Promise<{ uploadUrl: string }>;
  completeMultipart: (
    assetId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ) => Promise<void>;
}

export async function uploadFileMultipart(
  file: File,
  resumeKey: string,
  handlers: MultipartUploadHandlers,
  callbacks: MultipartUploadCallbacks = {},
): Promise<string> {
  const { onProgress, onSlowUploadDetected, onUploadStatsUpdate, onConcurrencyChange, onPartRetry } =
    callbacks;
  const resumed = loadResumableSession(resumeKey, file);

  let assetId: string;
  let uploadId: string;
  let partSizeBytes: number;
  const doneParts: Record<number, string> = resumed ? { ...resumed.parts } : {};

  if (resumed) {
    ({ assetId, uploadId, partSizeBytes } = resumed);
  } else {
    const init = await handlers.initMultipart(file.type, file.size);
    assetId = init.assetId;
    uploadId = init.uploadId;
    partSizeBytes = init.partSizeBytes;
    saveResumableSession({
      resumeKey,
      fileName: file.name,
      fileSize: file.size,
      fileLastModified: file.lastModified,
      assetId,
      uploadId,
      partSizeBytes,
      parts: {},
      updatedAt: Date.now(),
    });
  }

  const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));
  const partProgress = new Array<number>(totalParts).fill(0);
  const partSizes = new Array<number>(totalParts).fill(0);
  for (let i = 0; i < totalParts; i++) {
    const start = i * partSizeBytes;
    const end = Math.min(start + partSizeBytes, file.size);
    partSizes[i] = end - start;
    // Partie déjà confirmée par MinIO lors d'une tentative précédente
    if (doneParts[i + 1]) partProgress[i] = partSizes[i];
  }

  const startedAt = Date.now();
  const computeSpeedStats = (loaded: number, elapsedMs: number): SlowUploadInfo => {
    const bytesPerMs = loaded / elapsedMs;
    const remainingBytes = file.size - loaded;
    const etaMs = remainingBytes / bytesPerMs;
    return {
      throughputMbps: Math.round(((bytesPerMs * 1000 * 8) / 1_000_000) * 10) / 10,
      etaSeconds: Math.round(etaMs / 1000),
    };
  };

  // Le toast d'alerte ("Envoi lent détecté") ne doit apparaître qu'une fois —
  // mais l'estimation affichée sous la barre de progression doit continuer à
  // se rafraîchir ensuite (le débit varie dans le temps, notamment à cause de
  // la concurrence adaptative ci-dessous), throttlée pour ne pas re-render à
  // chaque octet reçu.
  let slowNotified = false;
  let lastStatsReportAt = 0;
  const maybeReportSlowUpload = (loaded: number) => {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < SLOW_UPLOAD_MIN_SAMPLE_MS || loaded < partSizeBytes) return;

    if (!slowNotified) {
      if (!onSlowUploadDetected) return;
      const stats = computeSpeedStats(loaded, elapsedMs);
      if (elapsedMs + stats.etaSeconds * 1000 < SLOW_UPLOAD_TOTAL_THRESHOLD_MS) return;
      slowNotified = true;
      lastStatsReportAt = Date.now();
      onSlowUploadDetected(stats);
      return;
    }

    if (!onUploadStatsUpdate) return;
    const now = Date.now();
    if (now - lastStatsReportAt < SLOW_UPLOAD_STATS_THROTTLE_MS) return;
    lastStatsReportAt = now;
    onUploadStatsUpdate(computeSpeedStats(loaded, elapsedMs));
  };

  const reportProgress = () => {
    const loaded = partProgress.reduce((sum, v) => sum + v, 0);
    onProgress?.(Math.round((loaded / file.size) * 100));
    maybeReportSlowUpload(loaded);
  };
  reportProgress();

  // ── Concurrence adaptative ──────────────────────────────────────────────
  const concurrencyCeiling = Math.min(MAX_CONCURRENCY, totalParts);
  let activeLimit = concurrencyCeiling;
  let baselineRttMs: number | null = null;
  let spikeStreak = 0;
  let recoveryStreak = 0;

  const recordLatency = (ms: number) => {
    if (baselineRttMs === null) {
      baselineRttMs = ms;
      return;
    }
    if (ms > baselineRttMs * LATENCY_SPIKE_FACTOR) {
      spikeStreak++;
      recoveryStreak = 0;
      if (spikeStreak >= SPIKE_STREAK_TO_THROTTLE && activeLimit > MIN_CONCURRENCY) {
        activeLimit--;
        spikeStreak = 0;
        onConcurrencyChange?.(activeLimit, concurrencyCeiling);
      }
    } else if (ms < baselineRttMs * LATENCY_RECOVERY_FACTOR) {
      recoveryStreak++;
      spikeStreak = 0;
      if (recoveryStreak >= RECOVERY_STREAK_TO_RESTORE && activeLimit < concurrencyCeiling) {
        activeLimit++;
        recoveryStreak = 0;
        onConcurrencyChange?.(activeLimit, concurrencyCeiling);
      }
    } else {
      spikeStreak = 0;
      recoveryStreak = 0;
    }
  };

  const uploadPart = async (partIndex: number): Promise<{ partNumber: number; etag: string }> => {
    const partNumber = partIndex + 1;
    const existingEtag = doneParts[partNumber];
    if (existingEtag) {
      return { partNumber, etag: existingEtag };
    }

    const start = partIndex * partSizeBytes;
    const end = start + partSizes[partIndex];
    const blob = file.slice(start, end);

    let lastError: unknown;
    for (let attempt = 1; attempt <= PART_MAX_ATTEMPTS; attempt++) {
      try {
        const urlRequestStartedAt = Date.now();
        const { uploadUrl } = await handlers.getPartUrl(assetId, uploadId, partNumber);
        recordLatency(Date.now() - urlRequestStartedAt);

        const res = await axios.put(uploadUrl, blob, {
          onUploadProgress: (e) => {
            partProgress[partIndex] = e.loaded;
            reportProgress();
          },
        });
        const etag: string | undefined = res.headers.etag ?? res.headers.ETag;
        if (!etag) {
          throw new Error(`Partie ${partNumber} : ETag manquant dans la réponse`);
        }
        const cleanEtag = etag.replaceAll('"', "");
        partProgress[partIndex] = partSizes[partIndex];
        reportProgress();
        // Persisté dès confirmation — une coupure après ce point ne reperd pas la partie
        markPartDone(resumeKey, partNumber, cleanEtag);
        return { partNumber, etag: cleanEtag };
      } catch (err) {
        lastError = err;
        // Tentative ratée : ne pas compter ses octets partiels comme acquis
        partProgress[partIndex] = 0;
        reportProgress();
        if (attempt === PART_MAX_ATTEMPTS) break;
        onPartRetry?.(partNumber, attempt, PART_MAX_ATTEMPTS);
        const backoff = Math.min(
          PART_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
          PART_RETRY_MAX_DELAY_MS,
        );
        await delay(backoff + backoff * 0.3 * Math.random());
      }
    }
    throw lastError;
  };

  // Pool à concurrence limitée : jusqu'à MAX_CONCURRENCY parties en vol
  // simultanément (pas tout le fichier d'un coup — mémoire navigateur et
  // nombre de connexions). Chaque worker a un rang fixe ; un worker dont le
  // rang dépasse `activeLimit` se met en pause plutôt que de consommer une
  // partie, et reprend automatiquement si la limite remonte.
  const parts: Array<{ partNumber: number; etag: string }> = new Array(totalParts);
  let nextIndex = 0;
  const worker = async (workerId: number) => {
    for (;;) {
      if (workerId >= activeLimit) {
        await delay(500);
        if (nextIndex >= totalParts) return;
        continue;
      }
      if (nextIndex >= totalParts) return;
      const current = nextIndex++;
      parts[current] = await uploadPart(current);
    }
  };
  await Promise.all(
    Array.from({ length: concurrencyCeiling }, (_, workerId) => worker(workerId)),
  );

  await handlers.completeMultipart(assetId, uploadId, parts);
  clearResumableSession(resumeKey);
  return assetId;
}
