import { Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { VideoAssetStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { VideoPipelineService } from './video-pipeline.service';
import { VideoPipelineSettingsService } from './video-pipeline-settings.service';
import { VideoPipelineNotificationService } from '../notifications/video-pipeline-notification.service';
import { ContentDurationService } from '../../common/services/content-duration.service';
import {
  VIDEO_QUEUE,
  VIDEO_JOB_TYPES,
  MINIO_UPLOAD_CONCURRENCY,
  RenditionProfile,
  VideoEncoder,
  HLS_SEGMENT_DURATION,
  THUMBNAIL_COUNT,
  resolveHlsSegmentType,
  resolveProfilesForSource,
  resolveCpuParallelism,
  isTwoPhasePipelineEnabled,
  resolvePreviewProfile,
  resolveWorkerConcurrency,
  resolveJobLockDuration,
  resolveJobLockRenewTime,
  resolveX264Preset,
  resolveFFmpegThreads,
  setEffectiveFFmpegThreads,
} from './video-pipeline.constants';
import {
  buildScaleFormatChain,
  buildSinglePassFfmpegArgs,
  computeGopSize,
  computeRenditionWidth,
  isSinglePassLadderEnabled,
} from './video-transcode-ladder';
import {
  buildStoryboardFfmpegFilter,
  buildStoryboardVtt,
  resolveStoryboardTileCount,
  storyboardMinioKeys,
  storyboardSpriteLocalPath,
} from './video-storyboard';
import type { PackageMode } from './video-pipeline.service';
import { buildMasterPlaylistBody, type HlsMasterSegmentType } from './video-hls-manifest';

const WORKER_CONCURRENCY = resolveWorkerConcurrency();
const JOB_LOCK_DURATION = resolveJobLockDuration();
const JOB_LOCK_RENEW_TIME = resolveJobLockRenewTime(JOB_LOCK_DURATION);

const execFileAsync = promisify(execFile);

// ─── ffprobe types ────────────────────────────────────────────────────────────

interface FfprobeStream {
  codec_type:    string;
  codec_name?:   string;
  codec_tag_string?: string;
  width?:        number;
  height?:       number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?:     string;
  bit_rate?:     string;
  pix_fmt?:      string;
  color_transfer?: string; // 'smpte2084' = HDR10, 'arib-std-b67' = HLG
  color_primaries?: string;
  tags?: Record<string, string>; // rotation in tags.rotate
  side_data_list?: Array<{ side_data_type: string; rotation?: number }>;
  channels?:     number;
  sample_rate?:  string;
}

interface FfprobeFormat {
  duration?:  string;
  size?:      string;
  bit_rate?:  string;
  format_name?: string;
  tags?: Record<string, string>;
}

interface ProbeResult {
  streams:  FfprobeStream[];
  format?:  FfprobeFormat;
}

// ─── Processed metadata ───────────────────────────────────────────────────────

interface SourceMetadata {
  durationSec:    number;
  width:          number;
  height:         number;
  frameRate:      number;
  rotation:       number;   // 0 | 90 | 180 | 270
  isHDR:          boolean;
  videoCodec:     string;
  audioCodec:     string;
  audioChannels:  number;
  formatName:     string;
  displayWidth:   number;   // after rotation
  displayHeight:  number;   // after rotation
}

// ─── Job payloads ─────────────────────────────────────────────────────────────
// Tous les jobs reçoivent uniquement assetId.
// La métadonnée est propagée via job.getChildrenValues() (Flow Producer).

interface ProbePayload     { assetId: string }
interface TranscodePayload { assetId: string }
interface PackagePayload   { assetId: string; mode?: PackageMode }
interface ThumbnailPayload { assetId: string }

/** Valeur retournée par PROBE et propagée via getChildrenValues(). */
interface ProbeMeta { meta: SourceMetadata }

// ─── Processor ───────────────────────────────────────────────────────────────

@Processor(VIDEO_QUEUE, {
  concurrency: WORKER_CONCURRENCY,
  lockDuration: JOB_LOCK_DURATION,
  lockRenewTime: JOB_LOCK_RENEW_TIME,
})
export class VideoPipelineProcessor extends WorkerHost implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(VideoPipelineProcessor.name);

  private readonly ffmpegPath  = process.env.FFMPEG_PATH  ?? 'ffmpeg';
  private readonly ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe';
  private readonly env         = process.env.NODE_ENV ?? 'development';

  // Cached encoder detection (per process lifetime)
  private _encoder: VideoEncoder | null = null;

  /** Processus ffmpeg actifs → {assetId, job} — pour les tuer proprement sur
   * SIGTERM, marquer immédiatement l'asset en échec ET faire échouer le job
   * BullMQ correspondant proprement (voir onApplicationShutdown). Le `job` est
   * la même instance que le Worker nous a transmise — son `.token` reste
   * valide pour moveToFailed() tant que le process n'a pas complètement
   * quitté. */
  private readonly _activeProcs = new Map<ReturnType<typeof spawn>, { assetId: string; job: Job }>();

  /** Réapplication périodique des réglages pipeline (voir applyPipelineSettings). */
  private _settingsPollTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly SETTINGS_POLL_MS = 30_000;

  /** Sonde périodique des pipelines orphelins (voir healOrphanedPipelines). */
  private _orphanSweepTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly ORPHAN_SWEEP_MS = 5 * 60_000;
  private static readonly ORPHAN_STALE_MS = 15 * 60_000;

  constructor(
    private readonly prisma:    PrismaService,
    private readonly minio:     MinioService,
    private readonly pipeline:  VideoPipelineService,
    private readonly videoNotifications: VideoPipelineNotificationService,
    private readonly contentDuration: ContentDurationService,
    private readonly pipelineSettings: VideoPipelineSettingsService,
  ) {
    super();
  }

  /**
   * Applique la concurrence worker + les threads ffmpeg effectifs (détection
   * CPU du conteneur + éventuelle surcharge admin en base) — remplace les
   * variables d'environnement VIDEO_WORKER_CONCURRENCY/VIDEO_FFMPEG_THREADS
   * comme source de vérité à l'exécution, sans nécessiter de redéploiement.
   * `this.worker` (WorkerHost) expose l'instance BullMQ Worker sous-jacente,
   * dont `.concurrency` est modifiable dynamiquement (pas figée au démarrage).
   * Appelé une première fois à onModuleInit, puis à chaque nouveau PROBE pour
   * refléter un changement de réglage admin sans attendre un redémarrage.
   */
  private async applyPipelineSettings(): Promise<void> {
    try {
      const settings = await this.pipelineSettings.applyAndPersistDetection();
      this.worker.concurrency = settings.workerConcurrency;
      setEffectiveFFmpegThreads(settings.ffmpegThreads);
      this.logger.log(
        `Pipeline settings : CPU détecté=${settings.detectedCpuLimit} concurrency=${settings.workerConcurrency}` +
          `${settings.workerConcurrencyIsOverride ? ' (admin)' : ' (auto)'} threads=${settings.ffmpegThreads} (dérivé)` +
          ` maxQuality=${settings.maxQualityCode}`,
      );
    } catch (err) {
      this.logger.error(`applyPipelineSettings: ${(err as Error).message}`);
    }
  }

  /**
   * Détecte et relance les pipelines "orphelins" : un asset resté en
   * TRANSCODING/PROBING/PACKAGING sans qu'aucun job BullMQ suivi (actif, en
   * attente...) ne lui corresponde. Cet état peut survenir quand le worker
   * est redéployé pendant qu'un job est actif — voir onApplicationShutdown,
   * qui échoue désormais proprement les jobs actifs au moment de l'arrêt,
   * mais ce filet couvre aussi les cas où l'interruption a été plus brutale
   * (OOM kill, crash) sans passer par ce hook. Ne retraite jamais les
   * renditions déjà encodées (`skipExistingRenditions` dans prepareTranscode)
   * — la relance ne refait donc que les étapes manquantes (généralement juste
   * l'empaquetage final). `ORPHAN_STALE_MS` (15 min) évite de agir sur un job
   * qui vient tout juste de démarrer. Trouvé le 2026-07-07.
   */
  private async healOrphanedPipelines(): Promise<void> {
    try {
      const staleDate = new Date(Date.now() - VideoPipelineProcessor.ORPHAN_STALE_MS);
      const candidates = await this.prisma.videoAsset.findMany({
        where: {
          status: {
            in: [VideoAssetStatus.TRANSCODING, VideoAssetStatus.PROBING, VideoAssetStatus.PACKAGING],
          },
          updatedAt: { lt: staleDate },
        },
        select: { id: true },
      });

      for (const { id } of candidates) {
        const alive = await this.pipeline.hasLiveJob(id);
        if (alive) continue;

        this.logger.warn(
          `Pipeline orphelin détecté pour l'asset ${id} (aucun job BullMQ suivi) — relance automatique`,
        );
        try {
          await this.prisma.videoAsset.update({
            where: { id },
            data: { status: VideoAssetStatus.UPLOADED, errorMessage: null },
          });
          await this.pipeline.createPipelineFlow(id);
        } catch (err) {
          this.logger.error(`healOrphanedPipelines: relance ${id} — ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.error(`healOrphanedPipelines: ${(err as Error).message}`);
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /** Récupération au démarrage : assets bloqués en TRANSCODING/PROBING/PACKAGING → FAILED. */
  async onModuleInit(): Promise<void> {
    await this.applyPipelineSettings();
    // Réapplique les réglages toutes les 30s : un changement de concurrency
    // en admin est ainsi pris en compte à chaud (Worker.concurrency est lu à
    // chaque itération de la boucle BullMQ, pas figé au démarrage — vérifié
    // dans le code source bullmq), sans redémarrer le worker ni interrompre
    // les jobs en cours.
    this._settingsPollTimer = setInterval(() => {
      void this.applyPipelineSettings();
    }, VideoPipelineProcessor.SETTINGS_POLL_MS);
    this._orphanSweepTimer = setInterval(() => {
      void this.healOrphanedPipelines();
    }, VideoPipelineProcessor.ORPHAN_SWEEP_MS);
    try {
      const staleMs = Math.max(JOB_LOCK_DURATION, 3_600_000);
      const staleDate = new Date(Date.now() - staleMs);
      const stale = await this.prisma.videoAsset.findMany({
        where: {
          status: { in: [
            VideoAssetStatus.TRANSCODING,
            VideoAssetStatus.PROBING,
            VideoAssetStatus.PACKAGING,
          ] },
          updatedAt: { lt: staleDate },
        },
        select: { id: true },
      });
      if (stale.length === 0) return;
      this.logger.warn(`Boot recovery: ${stale.length} asset(s) bloqué(s) → FAILED`);
      await this.prisma.videoAsset.updateMany({
        where: { id: { in: stale.map((a) => a.id) } },
        data: { status: VideoAssetStatus.FAILED, errorMessage: 'Pipeline interrompu (redémarrage worker)' },
      });
    } catch (err) {
      this.logger.error(`Boot recovery: ${(err as Error).message}`);
    }
  }

  /**
   * Arrêt gracieux : envoie SIGTERM puis SIGKILL aux processus ffmpeg actifs,
   * ET marque immédiatement les assets concernés en FAILED.
   *
   * Avant ce correctif, un déploiement (qui redémarre ce worker — même image
   * que l'API) tuait le process ffmpeg sans jamais mettre à jour le statut en
   * base : l'asset restait bloqué en TRANSCODING jusqu'au recovery de
   * onModuleInit, qui n'agit qu'après 1h (voir JOB_LOCK_DURATION). Le
   * créateur n'avait donc aucun bouton "Relancer" disponible (il n'apparaît
   * qu'en statut FAILED) pendant tout ce temps. Découvert et corrigé le
   * 2026-07-03 après interruption réelle d'un upload en production.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this._settingsPollTimer) {
      clearInterval(this._settingsPollTimer);
      this._settingsPollTimer = null;
    }
    if (this._orphanSweepTimer) {
      clearInterval(this._orphanSweepTimer);
      this._orphanSweepTimer = null;
    }
    if (this._activeProcs.size === 0) return;

    const active = [...this._activeProcs.values()];
    const interruptedAssetIds = [...new Set(active.map((a) => a.assetId))];
    this.logger.warn(
      `Arrêt ${signal ?? 'gracieux'} — interruption de ${this._activeProcs.size} processus ffmpeg (assets: ${interruptedAssetIds.join(', ')})`,
    );

    for (const proc of this._activeProcs.keys()) {
      proc.kill('SIGTERM');
    }
    await new Promise<void>((r) => setTimeout(r, 5_000));
    for (const proc of this._activeProcs.keys()) {
      if (!proc.killed) proc.kill('SIGKILL');
    }

    // Échoue proprement chaque job BullMQ actif (avec son token de verrou en
    // cours) AVANT de couper — sans ça, le job reste "active" dans Redis et
    // dépend entièrement de l'expiration du verrou + de la détection de job
    // bloqué de BullMQ pour être repris, ce qui a laissé des jobs PACKAGE
    // parents orphelins (jamais promus dans aucune liste suivie) après un
    // déploiement pendant un encodage — trouvé le 2026-07-07 sur plusieurs
    // assets (AKOUA, Maquisards...) bloqués indéfiniment après une relance du
    // worker en pleine transcodage.
    for (const { assetId, job } of active) {
      if (!job.token) continue;
      try {
        await job.moveToFailed(
          new Error('Interrompu par un déploiement — relancez l’encodage'),
          job.token,
          false,
        );
      } catch (err) {
        this.logger.error(`moveToFailed [${assetId}/${job.id}] après interruption: ${(err as Error).message}`);
      }
    }

    try {
      await this.prisma.videoAsset.updateMany({
        where: {
          id: { in: interruptedAssetIds },
          status: {
            in: [VideoAssetStatus.TRANSCODING, VideoAssetStatus.PROBING, VideoAssetStatus.PACKAGING],
          },
        },
        data: {
          status: VideoAssetStatus.FAILED,
          errorMessage: 'Interrompu par un déploiement — relancez l’encodage',
        },
      });
    } catch (err) {
      this.logger.error(`Marquage FAILED après interruption: ${(err as Error).message}`);
    }
  }

  // ─── Dispatch ──────────────────────────────────────────────────────────────

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job ${job.name} [${job.id}] attempt ${job.attemptsMade + 1}`);
    switch (job.name) {
      case VIDEO_JOB_TYPES.PROBE:
        return this.handleProbe(job as Job<ProbePayload>);
      case VIDEO_JOB_TYPES.TRANSCODE:
        return this.handleTranscode(job as Job<TranscodePayload>);
      case VIDEO_JOB_TYPES.TRANSCODE_PREVIEW:
        return this.handleTranscodePreview(job as Job<TranscodePayload>);
      case VIDEO_JOB_TYPES.TRANSCODE_FULL:
        return this.handleTranscodeFull(job as Job<TranscodePayload>);
      case VIDEO_JOB_TYPES.PACKAGE:
        return this.handlePackage(job as Job<PackagePayload>);
      case VIDEO_JOB_TYPES.THUMBNAIL:
        return this.handleThumbnail(job as Job<ThumbnailPayload>);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  // ─── PROBE ─────────────────────────────────────────────────────────────────

  private async handleProbe(job: Job<ProbePayload>): Promise<ProbeMeta> {
    const { assetId } = job.data;
    const tmpDir = this.tmpDir(assetId);

    // Rafraîchit concurrency/threads à chaque nouveau pipeline — reflète un
    // changement de réglage admin sans attendre un redémarrage du worker.
    await this.applyPipelineSettings();

    const asset = await this.prisma.videoAsset.findUniqueOrThrow({ where: { id: assetId } });

    await this.updateAsset(assetId, VideoAssetStatus.PROBING);
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.PROBE, job);

    try {
      await fs.mkdir(tmpDir, { recursive: true });

      const ext = path.extname(asset.sourceObjectKey).replace('.', '') || 'mp4';
      const sourceFile = path.join(tmpDir, `source.${ext}`);
      await this.minio.downloadFile(this.minio.bucketVideos, asset.sourceObjectKey, sourceFile);

      const meta = await this.probeFile(sourceFile);

      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: {
          status:      VideoAssetStatus.UPLOADED,
          durationSec: meta.durationSec  || undefined,
          width:       meta.displayWidth  || undefined,
          height:      meta.displayHeight || undefined,
          frameRate:   meta.frameRate    || undefined,
        },
      });

      if (meta.durationSec > 0) {
        await this.contentDuration.syncFromVideoAsset(assetId);
      }

      await this.doneVideoJob(videoJob.id);

      this.logger.log(
        `PROBE done [${assetId}]: ${meta.displayWidth}×${meta.displayHeight} ` +
        `@${meta.frameRate}fps ${meta.durationSec}s | ${meta.videoCodec}/${meta.audioCodec} ` +
        `| HDR=${meta.isHDR} rot=${meta.rotation}°`,
      );

      // Retourner meta pour que TRANSCODE y accède via job.getChildrenValues()
      return { meta };
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    } finally {
      await this.cleanTmpDir(tmpDir);
    }
  }

  // ─── TRANSCODE (legacy une passe) ───────────────────────────────────────────

  private async handleTranscode(job: Job<TranscodePayload>): Promise<void> {
    const { assetId } = job.data;
    const tmpDir = this.tmpDir(assetId);
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.TRANSCODE, job);

    try {
      const metaFromProbe = this.extractChildMeta(await job.getChildrenValues());
      const { sourceFile, meta, encoder, profiles } = await this.prepareTranscode(
        assetId,
        metaFromProbe,
        tmpDir,
      );
      await this.runTranscodeProfiles(assetId, sourceFile, tmpDir, profiles, encoder, meta, job);
      await this.doneVideoJob(videoJob.id);
      this.logger.log(`TRANSCODE done [${assetId}] — ${profiles.length} renditions`);
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    } finally {
      await this.cleanTmpDir(tmpDir);
    }
  }

  /** Phase 3a — preview 720p pour lecture rapide */
  private async handleTranscodePreview(job: Job<TranscodePayload>): Promise<ProbeMeta> {
    const { assetId } = job.data;
    const tmpDir = this.tmpDir(assetId);
    await this.updateAsset(assetId, VideoAssetStatus.TRANSCODING);
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.TRANSCODE_PREVIEW, job);

    try {
      const metaFromProbe = this.extractChildMeta(await job.getChildrenValues());
      const { sourceFile, meta, encoder } = await this.prepareTranscode(
        assetId,
        metaFromProbe,
        tmpDir,
      );
      const preview = resolvePreviewProfile(meta.displayHeight);
      this.logger.log(
        `TRANSCODE_PREVIEW [${assetId}]: profil=${preview.name} encoder=${encoder} duration=${meta.durationSec}s`,
      );
      await this.runTranscodeProfiles(assetId, sourceFile, tmpDir, [preview], encoder, meta, job);
      await this.doneVideoJob(videoJob.id);
      this.logger.log(`TRANSCODE_PREVIEW done [${assetId}]`);
      // Propager meta vers PACKAGE_PREVIEW → TRANSCODE_FULL via getChildrenValues()
      return { meta };
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    } finally {
      await this.cleanTmpDir(tmpDir);
    }
  }

  /** Phase 3b — ladder complète (profils restants après preview) */
  private async handleTranscodeFull(job: Job<TranscodePayload>): Promise<void> {
    const { assetId } = job.data;
    const tmpDir = this.tmpDir(assetId);
    await this.updateAsset(assetId, VideoAssetStatus.TRANSCODING);
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.TRANSCODE_FULL, job);

    try {
      // Meta propagée depuis PROBE via TRANSCODE_PREVIEW → PACKAGE_PREVIEW
      const metaPropagated = this.extractChildMeta(await job.getChildrenValues());
      const { sourceFile, meta, encoder, profiles } = await this.prepareTranscode(
        assetId,
        metaPropagated,
        tmpDir,
        { skipExistingRenditions: true },
      );
      if (profiles.length === 0) {
        this.logger.log(`TRANSCODE_FULL [${assetId}]: aucun profil restant — package direct`);
        await this.doneVideoJob(videoJob.id);
        return;
      }
      this.logger.log(
        `TRANSCODE_FULL [${assetId}]: encoder=${encoder} profiles=${profiles.map((p) => p.name).join(',')}`,
      );
      await this.runTranscodeProfiles(assetId, sourceFile, tmpDir, profiles, encoder, meta, job);
      await this.doneVideoJob(videoJob.id);
      this.logger.log(`TRANSCODE_FULL done [${assetId}] — ${profiles.length} renditions`);
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    } finally {
      await this.cleanTmpDir(tmpDir);
    }
  }

  private async prepareTranscode(
    assetId: string,
    metaInput: SourceMetadata | undefined,
    tmpDir: string,
    opts?: { skipExistingRenditions?: boolean },
  ): Promise<{
    sourceFile: string;
    meta: SourceMetadata;
    encoder: VideoEncoder;
    profiles: RenditionProfile[];
  }> {
    await this.updateAsset(assetId, VideoAssetStatus.TRANSCODING);
    await fs.mkdir(tmpDir, { recursive: true });

    const asset = await this.prisma.videoAsset.findUniqueOrThrow({
      where: { id: assetId },
      select: { sourceObjectKey: true },
    });
    const ext = path.extname(asset.sourceObjectKey).replace('.', '') || 'mp4';
    const sourceFile = path.join(tmpDir, `source.${ext}`);
    await this.minio.downloadFile(this.minio.bucketVideos, asset.sourceObjectKey, sourceFile);

    let meta = metaInput;
    if (!meta) {
      this.logger.warn(`TRANSCODE [${assetId}]: meta absent — re-probe en cours`);
      meta = await this.probeFile(sourceFile);
    }

    const encoder = await this.detectEncoder();
    const maxAllowedHeight = await this.pipelineSettings.resolveMaxQualityHeightForAsset(assetId);
    let profiles = resolveProfilesForSource(meta.displayHeight, maxAllowedHeight);

    if (opts?.skipExistingRenditions) {
      const existing = await this.prisma.videoRendition.findMany({
        where: { assetId },
        select: { name: true },
      });
      const done = new Set(existing.map((r) => r.name));
      profiles = profiles.filter((p) => !done.has(p.name));
    }

    return { sourceFile, meta, encoder, profiles };
  }

  private async runTranscodeProfiles(
    assetId: string,
    sourceFile: string,
    tmpDir: string,
    profiles: RenditionProfile[],
    encoder: VideoEncoder,
    meta: SourceMetadata,
    job: Job,
  ): Promise<void> {
    if (profiles.length === 0) return;

    const canSinglePass =
      encoder === 'libx264' &&
      profiles.length > 1 &&
      isSinglePassLadderEnabled();

    if (canSinglePass) {
      try {
        await this.transcodeRenditionsSinglePass(
          assetId,
          sourceFile,
          tmpDir,
          profiles,
          meta,
          job,
        );
        return;
      } catch (err) {
        this.logger.warn(
          `TRANSCODE [${assetId}] ladder single-pass échoué — repli séquentiel: ${(err as Error).message}`,
        );
      }
    }

    await this.runTranscodeProfilesSequential(
      assetId,
      sourceFile,
      tmpDir,
      profiles,
      encoder,
      meta,
      job,
    );
  }

  /** Encodeur GPU ou repli après échec single-pass. */
  private async runTranscodeProfilesSequential(
    assetId: string,
    sourceFile: string,
    tmpDir: string,
    profiles: RenditionProfile[],
    encoder: VideoEncoder,
    meta: SourceMetadata,
    job: Job,
  ): Promise<void> {
    const isGpu = encoder !== 'libx264';
    if (isGpu) {
      for (const profile of profiles) {
        await this.transcodeRendition(assetId, sourceFile, tmpDir, profile, encoder, meta, job);
      }
      return;
    }
    const parallel = resolveCpuParallelism(this.env);
    this.logger.log(`TRANSCODE [${assetId}]: parallélisme CPU (séquentiel) ×${parallel}`);
    await this.runWithConcurrency(profiles, parallel, (profile) =>
      this.transcodeRendition(assetId, sourceFile, tmpDir, profile, encoder, meta, job),
    );
  }

  /**
   * Une passe ffmpeg : split + scale + N encodages HLS (un seul décodage source).
   */
  private async transcodeRenditionsSinglePass(
    assetId: string,
    sourceFile: string,
    tmpDir: string,
    profiles: RenditionProfile[],
    meta: SourceMetadata,
    job: Job,
  ): Promise<void> {
    const names = profiles.map((p) => p.name).join(', ');
    this.logger.log(
      `TRANSCODE [${assetId}] ladder single-pass (${profiles.length}): ${names}`,
    );

    await Promise.all(
      profiles.map((p) => fs.mkdir(path.join(tmpDir, p.name), { recursive: true })),
    );

    const ladderMeta = {
      displayWidth: meta.displayWidth,
      displayHeight: meta.displayHeight,
      frameRate: meta.frameRate,
      durationSec: meta.durationSec,
      isHDR: meta.isHDR,
      audioChannels: meta.audioChannels,
    };

    const ffmpegArgs = buildSinglePassFfmpegArgs({
      sourceFile,
      tmpDir,
      profiles,
      meta: ladderMeta,
      videoEncoderArgs: (profile) => this.encoderArgs('libx264', profile),
    });

    await this.runFfmpeg(
      ffmpegArgs,
      `${assetId}/ladder[${names}]`,
      meta.durationSec,
      job,
      (pct) => {
        this.logger.log(`TRANSCODE [${assetId}] ladder: ${pct}%`);
      },
    );

    for (const profile of profiles) {
      await this.persistRenditionFromDisk(assetId, tmpDir, profile, meta);
    }
  }

  private async transcodeRendition(
    assetId:    string,
    sourceFile: string,
    tmpDir:     string,
    profile:    RenditionProfile,
    encoder:    VideoEncoder,
    meta:       SourceMetadata,
    job:        Job,
  ): Promise<void> {
    const renditionDir = path.join(tmpDir, profile.name);
    await fs.mkdir(renditionDir, { recursive: true });

    const outputM3u8 = path.join(renditionDir, 'index.m3u8');
    const segmentType = resolveHlsSegmentType();
    const segmentPat = path.join(
      renditionDir,
      segmentType === 'fmp4' ? 'seg%05d.m4s' : 'seg%05d.ts',
    );
    const initFile = path.join(renditionDir, 'init.mp4');
    const gopSize = computeGopSize(meta.frameRate);
    const videoFilter = buildScaleFormatChain(profile.height, meta.isHDR);
    const hasAudio = meta.audioChannels > 0;

    const ffmpegArgs = [
      '-v',      'error',       // stderr = erreurs uniquement (+ progress via -progress)
      '-hide_banner',            // supprime la bannière version ffmpeg
      '-threads', String(resolveFFmpegThreads()),
      '-i',       sourceFile,

      // Video — format=yuv420p dans le filtre est suffisant, pas besoin de -pix_fmt
      '-vf',        videoFilter,
      '-c:v',       encoder,
      ...this.encoderArgs(encoder, profile),
      '-g',         String(gopSize),    // GOP = 1 segment → keyframe à chaque début de segment
      '-keyint_min', String(gopSize),
      '-sc_threshold', '0',            // désactive les keyframes sur changement de scène

      // Audio — conditionnel selon présence d'un stream audio dans la source
      ...(hasAudio
        ? ['-c:a', 'aac', '-b:a', String(profile.audioBitrate), '-ac', '2',
           '-af', 'aresample=48000,loudnorm=I=-16:LRA=11:TP=-1.5']
        : ['-an']),

      // HLS output
      '-hls_time',             String(HLS_SEGMENT_DURATION),
      '-hls_playlist_type',    'vod',
      ...(segmentType === 'fmp4'
        ? ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', initFile]
        : []),
      '-hls_segment_filename', segmentPat,
      '-hls_flags',            'independent_segments',

      '-y',
      outputM3u8,
    ];

    await this.runFfmpeg(
      ffmpegArgs,
      `${assetId}/${profile.name}`,
      meta.durationSec,
      job,
      (pct) => {
        this.logger.log(`TRANSCODE [${assetId}] ${profile.name}: ${pct}%`);
      },
    );

    await this.persistRenditionFromDisk(assetId, tmpDir, profile, meta);
  }

  private async persistRenditionFromDisk(
    assetId: string,
    tmpDir: string,
    profile: RenditionProfile,
    meta: SourceMetadata,
  ): Promise<void> {
    const renditionDir = path.join(tmpDir, profile.name);
    const files = await fs.readdir(renditionDir);
    // Limiter le parallélisme MinIO : évite les 429 sur les grosses renditions HLS (600+ segments)
    await this.runWithConcurrency(files, MINIO_UPLOAD_CONCURRENCY, (file) =>
      this.minio.uploadFile(
        this.minio.bucketVideos,
        `hls/${assetId}/${profile.name}/${file}`,
        path.join(renditionDir, file),
      ),
    );

    await this.prisma.videoRendition.create({
      data: {
        assetId,
        name: profile.name,
        width: computeRenditionWidth(
          {
            displayWidth: meta.displayWidth,
            displayHeight: meta.displayHeight,
            frameRate: meta.frameRate,
            durationSec: meta.durationSec,
            isHDR: meta.isHDR,
            audioChannels: meta.audioChannels,
          },
          profile.height,
        ),
        height: profile.height,
        videoBitrate: profile.videoBitrate,
        audioBitrate: profile.audioBitrate,
        playlistPath: `hls/${assetId}/${profile.name}/index.m3u8`,
        codecs: profile.codecString,
      },
    });

    this.logger.log(`Rendition ${profile.name} ready for asset ${assetId}`);
  }

  // ─── PACKAGE ───────────────────────────────────────────────────────────────

  private async handlePackage(job: Job<PackagePayload>): Promise<ProbeMeta | undefined> {
    const { assetId } = job.data;
    const mode: PackageMode = job.data.mode ?? 'full';

    await this.updateAsset(assetId, VideoAssetStatus.PACKAGING);
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.PACKAGE, job);

    try {
      const renditions = await this.prisma.videoRendition.findMany({
        where: { assetId },
        orderBy: { height: 'asc' },
      });

      if (renditions.length === 0) {
        throw new Error('Aucune rendition à packager');
      }

      const manifestKey = await this.buildAndUploadMasterManifest(
        assetId,
        renditions,
        resolveHlsSegmentType(),
      );

      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: { manifestPath: manifestKey },
      });

      await this.doneVideoJob(videoJob.id);

      if (mode === 'preview') {
        await this.updateAsset(assetId, VideoAssetStatus.READY_PREVIEW);
        await this.videoNotifications.notifyPreviewReady(assetId);
        this.logger.log(
          `PACKAGE preview [${assetId}]: ${renditions.length} rendition(s) → lecture disponible`,
        );
        // Propager meta depuis TRANSCODE_PREVIEW → TRANSCODE_FULL via getChildrenValues()
        const meta = this.extractChildMeta(await job.getChildrenValues());
        return meta ? { meta } : undefined;
      }

      // mode === 'full' : Flow Producer lance THUMBNAIL automatiquement
      this.logger.log(`PACKAGE full [${assetId}]: ${renditions.length} renditions → ${manifestKey}`);
      return undefined;
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    }
  }

  private async buildAndUploadMasterManifest(
    assetId: string,
    renditions: Array<{
      videoBitrate: number;
      audioBitrate: number;
      width: number;
      height: number;
      codecs: string | null;
      playlistPath: string;
    }>,
    segmentType: HlsMasterSegmentType = 'ts',
  ): Promise<string> {
    const asset = await this.prisma.videoAsset.findUniqueOrThrow({
      where: { id: assetId },
      select: { contentId: true, episodeId: true },
    });

    const subtitleTracks = await this.prisma.subtitleTrack.findMany({
      where: {
        contentId: asset.contentId,
        episodeId: asset.episodeId,
      },
      include: { language: { select: { code: true, label: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const body = buildMasterPlaylistBody(
      renditions,
      subtitleTracks.map((t) => ({
        languageCode: t.language.code,
        label: t.language.label,
        objectKey: t.objectKey,
        isDefault: t.isDefault,
      })),
      [],
      segmentType,
    );

    const manifestKey = `hls/${assetId}/master.m3u8`;
    await this.minio.uploadBuffer(
      this.minio.bucketVideos,
      manifestKey,
      Buffer.from(body, 'utf-8'),
      'application/vnd.apple.mpegurl',
    );
    return manifestKey;
  }

  // ─── THUMBNAIL ─────────────────────────────────────────────────────────────

  private async handleThumbnail(job: Job<ThumbnailPayload>): Promise<void> {
    const { assetId } = job.data;
    const tmpDir = this.tmpDir(assetId);

    const asset = await this.prisma.videoAsset.findUniqueOrThrow({ where: { id: assetId } });
    const videoJob = await this.startVideoJob(assetId, VIDEO_JOB_TYPES.THUMBNAIL, job);

    try {
      await fs.mkdir(tmpDir, { recursive: true });

      const ext = path.extname(asset.sourceObjectKey).replace('.', '') || 'mp4';
      const sourceFile = path.join(tmpDir, `source.${ext}`);
      await this.minio.downloadFile(this.minio.bucketVideos, asset.sourceObjectKey, sourceFile);

      const duration = asset.durationSec ?? 60;

      // Generate THUMBNAIL_COUNT thumbnails at evenly-spaced positions (avoid black frames at 0%)
      const positions = Array.from({ length: THUMBNAIL_COUNT }, (_, i) =>
        Math.floor(duration * (0.05 + (0.85 / (THUMBNAIL_COUNT - 1)) * i)),
      );

      const posterKeys: string[] = [];
      for (const [idx, position] of positions.entries()) {
        const thumbFile = path.join(tmpDir, `thumb_${idx}.jpg`);

        await execFileAsync(this.ffmpegPath, [
          '-ss', String(position),
          '-i',  sourceFile,
          '-frames:v', '1',
          '-vf', 'scale=1280:-2',     // normalize to 720p width
          '-q:v', '3',                // JPEG quality (1=best, 31=worst)
          '-y',
          thumbFile,
        ]);

        const thumbKey = `thumbnails/${assetId}/thumb_${idx}.jpg`;
        await this.minio.uploadFile(this.minio.bucketVideos, thumbKey, thumbFile);
        posterKeys.push(thumbKey);
      }

      // Primary poster = thumbnail at 10% position
      const primaryKey = posterKeys[1] ?? posterKeys[0];

      let storyboardSpriteKey: string | null = null;
      let storyboardVttKey: string | null = null;
      try {
        const { spriteKey, vttKey } = storyboardMinioKeys(assetId);
        const tileCount = resolveStoryboardTileCount(duration);
        const spriteLocal = storyboardSpriteLocalPath(tmpDir);
        await execFileAsync(this.ffmpegPath, [
          '-i',
          sourceFile,
          '-vf',
          buildStoryboardFfmpegFilter(tileCount),
          '-frames:v',
          '1',
          '-q:v',
          '5',
          '-y',
          spriteLocal,
        ]);
        await this.minio.uploadFile(this.minio.bucketVideos, spriteKey, spriteLocal);
        const vttBody = buildStoryboardVtt(duration);
        await this.minio.uploadBuffer(
          this.minio.bucketVideos,
          vttKey,
          Buffer.from(vttBody, 'utf-8'),
          'text/vtt',
        );
        storyboardSpriteKey = spriteKey;
        storyboardVttKey = vttKey;
        this.logger.log(`Storyboard [${assetId}]: ${tileCount} tiles → ${spriteKey}`);
      } catch (sbErr) {
        this.logger.warn(
          `Storyboard [${assetId}] ignoré: ${(sbErr as Error).message}`,
        );
      }

      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: {
          posterObjectKey: primaryKey,
          storyboardSpriteKey,
          storyboardVttKey,
          status: VideoAssetStatus.READY,
        },
      });

      if (asset.episodeId) {
        await this.prisma.episode.update({
          where: { id: asset.episodeId },
          data: { thumbnailObjectKey: primaryKey },
        });
      }

      await this.contentDuration.syncFromVideoAsset(assetId);

      await this.doneVideoJob(videoJob.id);
      await this.videoNotifications.notifyReady(assetId);

      this.logger.log(`THUMBNAIL done [${assetId}]: ${posterKeys.length} thumbs — pipeline COMPLETE`);
    } catch (err) {
      await this.failAsset(assetId, videoJob.id, err, job);
      throw err;
    } finally {
      await this.cleanTmpDir(tmpDir);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Extract rich metadata from a video file */
  private async probeFile(sourceFile: string): Promise<SourceMetadata> {
    const { stdout } = await execFileAsync(this.ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      sourceFile,
    ]);

    const data: ProbeResult = JSON.parse(stdout);

    const video   = data.streams.find((s) => s.codec_type === 'video');
    const audio   = data.streams.find((s) => s.codec_type === 'audio');

    if (!video) throw new Error('No video stream found in source file');

    const width     = video.width  ?? 0;
    const height    = video.height ?? 0;
    const fps       = this.parseFrameRate(video.avg_frame_rate ?? video.r_frame_rate ?? '24/1');
    const duration  = video.duration
      ? parseFloat(video.duration)
      : data.format?.duration
        ? parseFloat(data.format.duration)
        : 0;

    // Rotation detection (metadata tag or side_data)
    const tagRotation   = parseInt(video.tags?.rotate ?? '0', 10);
    const sideRotation  = video.side_data_list?.find(d => d.rotation != null)?.rotation ?? 0;
    const rotation      = Math.abs(tagRotation || sideRotation) as 0 | 90 | 180 | 270;
    const isTransposed  = rotation === 90 || rotation === 270;

    const displayWidth  = isTransposed ? height : width;
    const displayHeight = isTransposed ? width  : height;

    // HDR detection
    const isHDR = [
      video.color_transfer === 'smpte2084',  // HDR10
      video.color_transfer === 'arib-std-b67', // HLG
      video.color_primaries === 'bt2020',
      video.pix_fmt?.includes('10le') ?? false,
    ].some(Boolean);

    return {
      durationSec:   Math.round(duration),
      width,
      height,
      frameRate:     Math.round(fps * 100) / 100,
      rotation,
      isHDR,
      videoCodec:    video.codec_name  ?? 'unknown',
      audioCodec:    audio?.codec_name ?? 'none',
      audioChannels: audio?.channels   ?? 0,
      formatName:    data.format?.format_name ?? 'unknown',
      displayWidth,
      displayHeight,
    };
  }

  /** Select rendition profiles that don't upscale from the source */
  /** Exécute des tâches avec un parallélisme maximal (file d'attente). */
  private async runWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>,
  ): Promise<void> {
    if (items.length === 0) return;
    const queue = [...items];
    const workerCount = Math.min(Math.max(1, limit), items.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
          const item = queue.shift()!;
          await fn(item);
        }
      }),
    );
  }

  /** Detect available hardware encoder via a real test encode (cached) */
  private async detectEncoder(): Promise<VideoEncoder> {
    if (this._encoder) return this._encoder;

    const hwEnv = process.env.VIDEO_HW_ACCEL?.toLowerCase();
    if (hwEnv === 'nvenc')        { this._encoder = 'h264_nvenc';        return this._encoder; }
    if (hwEnv === 'vaapi')        { this._encoder = 'h264_vaapi';        return this._encoder; }
    if (hwEnv === 'videotoolbox') { this._encoder = 'h264_videotoolbox'; return this._encoder; }
    if (hwEnv === 'none')         { this._encoder = 'libx264';            return this._encoder; }

    // Teste chaque encoder avec un frame synthétique — évite les faux positifs
    // (un encoder peut être listé mais non fonctionnel si CUDA/libva n'est pas monté)
    const candidates: Array<{ enc: VideoEncoder; args: string[] }> = [
      {
        enc: 'h264_nvenc',
        args: ['-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=0.04:r=1',
               '-c:v', 'h264_nvenc', '-frames:v', '1', '-f', 'null', '-'],
      },
      {
        enc: 'h264_vaapi',
        args: ['-hwaccel', 'vaapi', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=0.04:r=1',
               '-vf', 'format=nv12|vaapi,hwupload', '-c:v', 'h264_vaapi', '-frames:v', '1', '-f', 'null', '-'],
      },
    ];

    for (const { enc, args } of candidates) {
      try {
        await execFileAsync(this.ffmpegPath, args, { timeout: 6_000 });
        this._encoder = enc;
        this.logger.log(`Hardware encoder actif : ${enc}`);
        return this._encoder;
      } catch {
        this.logger.debug(`${enc} non disponible — CUDA/libva manquant ou GPU absent`);
      }
    }

    this._encoder = 'libx264';
    this.logger.log(`Encodeur CPU : libx264`);
    return this._encoder;
  }

  /** Encoder-specific ffmpeg arguments */
  private encoderArgs(encoder: VideoEncoder, profile: RenditionProfile): string[] {
    const preset = resolveX264Preset(this.env);

    switch (encoder) {
      case 'h264_nvenc':
        return [
          // VBR bitrate-based — le mode le plus compatible avec toutes les cartes NVIDIA
          '-b:v',     String(profile.videoBitrate),
          '-maxrate', String(Math.round(profile.videoBitrate * 1.5)),
          '-bufsize',  String(profile.videoBitrate * 2),
          '-profile:v', 'high',
          '-level',   '4.1',
        ];

      case 'h264_vaapi':
        return [
          '-vf',      `format=nv12|vaapi,hwupload`,  // VAAPI needs pixel format
          '-quality', String(profile.crf),
          '-maxrate', String(profile.videoBitrate),
        ];

      case 'h264_videotoolbox':
        return [
          '-b:v',    String(profile.videoBitrate),
          '-maxrate', String(Math.round(profile.videoBitrate * 1.5)),
          '-bufsize', String(profile.videoBitrate * 2),
          '-profile:v', 'high',
        ];

      default: // libx264
        return [
          '-preset',    preset,
          '-crf',       String(profile.crf),
          '-maxrate',   String(profile.videoBitrate),
          '-bufsize',   String(profile.videoBitrate * 2),
          '-profile:v', 'high',
          '-level',     '4.0',
          // -movflags +faststart : utile pour MP4 standalone, pas pour HLS .ts segments
        ];
    }
  }

  /**
   * Run ffmpeg and report progress via BullMQ job.updateProgress().
   * ffmpeg outputs progress lines to stderr: "out_time_ms=XXXXXX"
   */
  private runFfmpeg(
    args: string[],
    label: string,
    totalSec: number,
    job: Job,
    onProgressLog?: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, ['-progress', 'pipe:2', ...args]);
      this._activeProcs.set(proc, { assetId: (job.data as { assetId: string }).assetId, job });

      // Timeout : 8× durée vidéo, min 1h, max 12h
      const timeoutMs = totalSec > 0
        ? Math.min(totalSec * 8_000, 12 * 3_600_000)
        : 4 * 3_600_000;
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill('SIGKILL');
          reject(new Error(`ffmpeg [${label}] timeout après ${Math.round(timeoutMs / 60_000)}min`));
        }
      }, timeoutMs);

      let stderr = '';
      let lastLoggedBucket = -1;

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderr += text;

        // Parse progress from "out_time_ms=12345678" lines
        const match = text.match(/out_time_ms=(\d+)/);
        if (match && totalSec > 0) {
          const pct = Math.min(99, Math.round((parseInt(match[1], 10) / 1e6 / totalSec) * 100));
          job.updateProgress(pct).catch(() => {});

          if (onProgressLog) {
            const bucket = Math.floor(pct / 10) * 10;
            if (bucket > lastLoggedBucket) {
              lastLoggedBucket = bucket;
              onProgressLog(pct);
            }
          }
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        this._activeProcs.delete(proc);
        if (settled) return;
        settled = true;
        if (code === 0) {
          job.updateProgress(100).catch(() => {});
          resolve();
        } else {
          // Extract last meaningful error line from stderr
          const errLine = stderr.split('\n').reverse().find((l) => l.trim().length > 0) ?? '';
          reject(new Error(`ffmpeg [${label}] exited ${code}: ${errLine.slice(0, 300)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        this._activeProcs.delete(proc);
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  // ─── Prisma helpers ────────────────────────────────────────────────────────

  private updateAsset(assetId: string, status: VideoAssetStatus) {
    return this.prisma.videoAsset.update({ where: { id: assetId }, data: { status } });
  }

  private startVideoJob(assetId: string, type: string, job: Job) {
    return this.prisma.videoJob.create({
      data: {
        assetId,
        type,
        status:      'RUNNING',
        attempts:    job.attemptsMade + 1,
        maxAttempts: 3,
        payload:     job.data as object,
        startedAt:   new Date(),
      },
    });
  }

  private doneVideoJob(videoJobId: string) {
    return this.prisma.videoJob.update({
      where: { id: videoJobId },
      data:  { status: 'DONE', finishedAt: new Date() },
    });
  }

  /**
   * `job` sert à distinguer un échec définitif d'un échec intermédiaire qui
   * sera retenté par BullMQ (attempts: 3 + backoff, voir video-worker.module.ts).
   * Avant ce correctif, CHAQUE tentative (y compris la 1ère sur 3) passait
   * l'asset en FAILED et déclenchait notifyFailed() (email/push/webhook) —
   * un créateur recevait une alerte d'échec alors même que la 2e tentative,
   * quelques secondes plus tard, réussissait souvent sans problème.
   */
  private async failAsset(assetId: string, videoJobId: string, err: unknown, job: Job): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

    if (!isFinalAttempt) {
      this.logger.warn(
        `Pipeline échec tentative ${job.attemptsMade + 1}/${maxAttempts} [${assetId}] — nouvel essai à venir : ${message}`,
      );
      // Statut/notification volontairement inchangés : BullMQ va retenter.
      return;
    }

    this.logger.error(`Pipeline FAILED (dernière tentative ${job.attemptsMade + 1}/${maxAttempts}) [${assetId}]: ${message}`);
    await Promise.all([
      this.prisma.videoAsset.update({
        where: { id: assetId },
        data:  { status: VideoAssetStatus.FAILED, errorMessage: message.slice(0, 500) },
      }),
      this.prisma.videoJob.update({
        where: { id: videoJobId },
        data:  { status: 'FAILED', lastError: message.slice(0, 500), finishedAt: new Date() },
      }),
    ]);
    await this.videoNotifications.notifyFailed(assetId, message);
  }

  // ─── Utils ─────────────────────────────────────────────────────────────────

  /**
   * Extrait SourceMetadata depuis le map retourné par job.getChildrenValues().
   * BullMQ stocke les valeurs enfants sous la forme { "<queue>:<jobId>": returnValue }.
   * On cherche la première entrée ayant une propriété `meta`.
   */
  private extractChildMeta(childrenValues: Record<string, unknown>): SourceMetadata | undefined {
    for (const val of Object.values(childrenValues)) {
      const candidate = val as { meta?: SourceMetadata } | null;
      if (candidate?.meta && typeof candidate.meta === 'object') {
        return candidate.meta;
      }
    }
    return undefined;
  }

  private tmpDir(assetId: string): string {
    return path.join(os.tmpdir(), 'ivod', assetId);
  }

  private async cleanTmpDir(tmpDir: string): Promise<void> {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`cleanTmpDir ${tmpDir}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private parseFrameRate(r: string): number {
    const parts = r.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      return den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
    }
    return parseFloat(r) || 0;
  }
}
