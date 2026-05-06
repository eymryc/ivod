import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Worker, type Job } from 'bullmq';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, readdir, readFile, rm, stat, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join, relative } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MediaJobsService } from './media-jobs.service';
import { UploadsService } from '../uploads/uploads.service';

type TranscodeJobData = { assetId: string };
type HlsProfile = {
  name: '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
  width: number;
  height: number;
  videoBitrate: number;
  maxrate: number;
  bufsize: number;
  audioBitrate: number;
};
type LadderPreset = 'mobile' | 'balanced' | 'tv';

@Injectable()
export class MediaTranscodeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaTranscodeWorker.name);
  private worker: Worker<TranscodeJobData> | null = null;
  private ffmpegBinary(): string {
    return (this.config.get<string>('FFMPEG_PATH') ?? 'ffmpeg').trim() || 'ffmpeg';
  }
  private static readonly HLS_PROFILE_DIMENSIONS: Array<Pick<HlsProfile, 'name' | 'width' | 'height'>> = [
    { name: '240p', width: 426, height: 240 },
    { name: '360p', width: 640, height: 360 },
    { name: '480p', width: 854, height: 480 },
    { name: '720p', width: 1280, height: 720 },
    { name: '1080p', width: 1920, height: 1080 },
    { name: '1440p', width: 2560, height: 1440 },
    { name: '2160p', width: 3840, height: 2160 },
  ];
  private static readonly LADDER_BITRATES: Record<LadderPreset, Record<HlsProfile['name'], { video: number; audio: number }>> = {
    mobile: {
      '240p': { video: 250_000, audio: 48_000 },
      '360p': { video: 550_000, audio: 64_000 },
      '480p': { video: 950_000, audio: 96_000 },
      '720p': { video: 1_900_000, audio: 96_000 },
      '1080p': { video: 3_500_000, audio: 128_000 },
      '1440p': { video: 6_000_000, audio: 128_000 },
      '2160p': { video: 10_000_000, audio: 128_000 },
    },
    balanced: {
      '240p': { video: 400_000, audio: 64_000 },
      '360p': { video: 800_000, audio: 96_000 },
      '480p': { video: 1_400_000, audio: 128_000 },
      '720p': { video: 2_800_000, audio: 128_000 },
      '1080p': { video: 5_000_000, audio: 128_000 },
      '1440p': { video: 9_000_000, audio: 192_000 },
      '2160p': { video: 16_000_000, audio: 192_000 },
    },
    tv: {
      '240p': { video: 600_000, audio: 96_000 },
      '360p': { video: 1_100_000, audio: 128_000 },
      '480p': { video: 2_000_000, audio: 128_000 },
      '720p': { video: 4_000_000, audio: 160_000 },
      '1080p': { video: 7_500_000, audio: 192_000 },
      '1440p': { video: 12_000_000, audio: 192_000 },
      '2160p': { video: 22_000_000, audio: 256_000 },
    },
  };

  private getLadderPreset(): LadderPreset {
    const raw = (this.config.get<string>('TRANSCODE_LADDER_PRESET') ?? 'balanced').trim().toLowerCase();
    if (raw === 'mobile' || raw === 'tv' || raw === 'balanced') return raw;
    return 'balanced';
  }

  private buildHlsProfiles(): HlsProfile[] {
    const preset = this.getLadderPreset();
    const bitrateMap = MediaTranscodeWorker.LADDER_BITRATES[preset];
    return MediaTranscodeWorker.HLS_PROFILE_DIMENSIONS.map((d) => {
      const rates = bitrateMap[d.name];
      const maxrate = Math.round(rates.video * 1.07);
      const bufsize = rates.video * 2;
      return {
        ...d,
        videoBitrate: rates.video,
        maxrate,
        bufsize,
        audioBitrate: rates.audio,
      };
    });
  }

  private getMaxTranscodeHeight(): number {
    const raw = (this.config.get<string>('TRANSCODE_MAX_HEIGHT') ?? '2160').trim();
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 2160;
    // Safety cap: avoid accidental 8K by default.
    return Math.min(parsed, 2160);
  }

  private getBullConnectionOptions(): { url: string; password?: string } | null {
    const direct = (this.config.get<string>('REDIS_URL') ?? '').trim();
    if (direct) return { url: direct };

    const upstashUrl = (this.config.get<string>('UPSTASH_REDIS_URL') ?? '').trim();
    if (!upstashUrl) return null;

    const token = (this.config.get<string>('UPSTASH_REDIS_TOKEN') ?? '').trim();
    return token ? { url: upstashUrl, password: token } : { url: upstashUrl };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly uploads: UploadsService,
  ) {}

  onModuleInit() {
    const connection = this.getBullConnectionOptions();
    const enabled = (this.config.get<string>('MEDIA_JOBS_ENABLE_WORKER') ?? 'true').toLowerCase() !== 'false';
    if (!connection || !enabled) return;

    try {
      const host = new URL(connection.url).hostname;
      this.logger.log(`Worker video.transcode démarré (Redis: ${host})`);
    } catch {
      // ignore
    }

    this.worker = new Worker<TranscodeJobData>(
      MediaJobsService.TRANSCODE_QUEUE_NAME,
      async (job) => this.handleTranscode(job),
      { connection: connection as never, concurrency: 2 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`video.transcode completed (${job.id})`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`video.transcode failed (${job?.id ?? 'unknown'}): ${err.message}`);
      // Stalled jobs bypass handleTranscode's catch block — update DB here
      const assetId: string | undefined = job?.data?.assetId;
      if (assetId) {
        void this.prisma.videoAsset
          .update({
            where: { id: assetId },
            data: { status: 'FAILED', errorCode: 'TRANSCODE_STALLED', errorMessage: err.message },
          })
          .catch(() => undefined);
        void this.prisma.videoJob
          .updateMany({
            where: { assetId, type: 'transcode', status: { in: ['queued', 'running'] } },
            data: { status: 'failed', lastError: err.message, finishedAt: new Date() },
          })
          .catch(() => undefined);
      }
    });

    // Recover assets stuck in TRANSCODING from a previous crashed process
    void this.recoverStalledAssets();
  }

  private async recoverStalledAssets() {
    try {
      const stuck = await this.prisma.videoAsset.findMany({
        where: { status: 'TRANSCODING' },
        select: { id: true },
      });
      if (stuck.length === 0) return;
      this.logger.warn(`Récupération de ${stuck.length} asset(s) bloqué(s) en TRANSCODING → FAILED`);
      await this.prisma.videoAsset.updateMany({
        where: { id: { in: stuck.map((a) => a.id) } },
        data: { status: 'FAILED', errorCode: 'TRANSCODE_STALLED', errorMessage: 'Worker redémarré pendant le transcodage' },
      });
      await this.prisma.videoJob.updateMany({
        where: { assetId: { in: stuck.map((a) => a.id) }, type: 'transcode', status: { in: ['queued', 'running'] } },
        data: { status: 'failed', lastError: 'Worker redémarré pendant le transcodage', finishedAt: new Date() },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`recoverStalledAssets (transcode) échoué: ${msg}`);
    }
  }

  private s3() {
    const endpoint = (this.config.get<string>('MINIO_ENDPOINT') ?? '').trim();
    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY') ?? '';
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY') ?? '';
    const region = this.config.get<string>('MINIO_REGION') ?? 'us-east-1';

    return new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private getBucket() {
    return this.config.get<string>('MINIO_BUCKET') ?? this.config.get<string>('S3_BUCKET') ?? 'ivod';
  }

  private posterPublicUrl(objectKey: string): string | null {
    const base = (this.config.get<string>('MINIO_PUBLIC_BASE_URL') ?? '').trim().replace(/\/+$/, '');
    if (!base) return null;
    return `${base}/${objectKey.replace(/^\//, '')}`;
  }

  /** Extrait une frame JPEG (poster) depuis la source, après seek. */
  private async extractPosterFrame(inputPath: string, outputJpegPath: string, seekSec: number) {
    const args = [
      '-y',
      '-ss',
      String(seekSec),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      '-vf',
      'scale=w=1280:h=720:force_original_aspect_ratio=decrease',
      outputJpegPath,
    ];
    await new Promise<void>((resolve, reject) => {
      const cp = spawn(this.ffmpegBinary(), args);
      let stderr = '';
      cp.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      cp.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `ffmpeg introuvable. Installez ffmpeg ou définissez FFMPEG_PATH (actuel: "${this.ffmpegBinary()}").`,
            ),
          );
          return;
        }
        reject(err);
      });
      cp.on('close', (code) => {
        if (code !== 0) return reject(new Error(stderr || `ffmpeg poster exited ${code}`));
        resolve();
      });
    });
  }

  private async downloadToTempFile(objectKey: string) {
    const suffix = basename(objectKey) || 'source.mp4';
    const tmpPath = join(tmpdir(), `ivod-transcode-${randomUUID()}-${suffix}`);
    const out = createWriteStream(tmpPath);
    const result = await this.s3().send(
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: objectKey,
      }),
    );
    const body = result.Body as NodeJS.ReadableStream | undefined;
    if (!body) throw new Error('S3 GetObject returned empty body');
    await pipeline(body, out);
    return tmpPath;
  }

  private selectProfilesForSource(sourceWidth: number | null | undefined, sourceHeight: number | null | undefined): HlsProfile[] {
    const allProfiles = this.buildHlsProfiles();
    const w = sourceWidth ?? 0;
    const h = sourceHeight ?? 0;
    const maxHeight = this.getMaxTranscodeHeight();
    const profileSet = allProfiles.filter((p) => p.height <= maxHeight);
    if (!w || !h) return profileSet;
    const profiles = profileSet.filter((p) => p.width <= w + 8 && p.height <= h + 8);
    if (profiles.length > 0) return profiles;
    return [profileSet[0] ?? allProfiles[0]];
  }

  /** Retourne true si le fichier source contient au moins une piste audio. */
  private async probeHasAudio(filePath: string): Promise<boolean> {
    const ffprobe = (this.config.get<string>('FFPROBE_PATH') ?? 'ffprobe').trim() || 'ffprobe';
    const args = ['-v', 'error', '-print_format', 'json', '-show_streams', '-select_streams', 'a', filePath];
    const output = await new Promise<string>((resolve, reject) => {
      const cp = spawn(ffprobe, args);
      let stdout = '';
      cp.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      cp.on('error', reject);
      cp.on('close', () => resolve(stdout));
    });
    try {
      const parsed = JSON.parse(output) as { streams?: unknown[] };
      return Array.isArray(parsed.streams) && parsed.streams.length > 0;
    } catch {
      return false;
    }
  }

  private async runFfmpegHls(
    inputPath: string,
    outputDir: string,
    profiles: HlsProfile[],
    durationSec: number | null | undefined,
    hasAudio: boolean,
    job?: Job<TranscodeJobData>,
  ) {
    for (let i = 0; i < profiles.length; i += 1) {
      await mkdir(join(outputDir, `v${i}`), { recursive: true });
    }

    const splitOut = profiles.map((_p, i) => `[v${i}]`).join('');
    const splitPart = `[0:v]split=${profiles.length}${splitOut}`;
    const scaleParts = profiles.map(
      (p, i) =>
        `[v${i}]scale=w=${p.width}:h=${p.height}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1[v${i}out]`,
    );
    const filterComplex = `${splitPart};${scaleParts.join(';')}`;

    const args: string[] = [
      '-y',
      '-i',
      inputPath,
      '-filter_complex',
      filterComplex,
    ];

    for (let i = 0; i < profiles.length; i += 1) {
      args.push('-map', `[v${i}out]`);
      if (hasAudio) args.push('-map', '0:a:0');
    }

    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-sc_threshold',
      '0',
      '-g',
      '48',
      '-keyint_min',
      '48',
    );

    if (hasAudio) {
      args.push('-c:a', 'aac', '-ar', '48000', '-ac', '2');
    }

    for (let i = 0; i < profiles.length; i += 1) {
      const p = profiles[i];
      args.push(
        `-b:v:${i}`,
        `${Math.round(p.videoBitrate / 1000)}k`,
        `-maxrate:v:${i}`,
        `${Math.round(p.maxrate / 1000)}k`,
        `-bufsize:v:${i}`,
        `${Math.round(p.bufsize / 1000)}k`,
      );
      if (hasAudio) {
        args.push(`-b:a:${i}`, `${Math.round(p.audioBitrate / 1000)}k`);
      }
    }

    args.push(
      '-f',
      'hls',
      '-hls_time',
      '4',
      '-hls_playlist_type',
      'vod',
      '-hls_flags',
      'independent_segments',
      '-hls_segment_filename',
      join(outputDir, 'v%v', 'seg_%06d.ts'),
      '-master_pl_name',
      'master.m3u8',
      '-var_stream_map',
      profiles.map((_p, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`)).join(' '),
      join(outputDir, 'v%v', 'index.m3u8'),
    );

    await new Promise<void>((resolve, reject) => {
      // Use ffmpeg progress output on stdout so we can compute % from out_time_ms.
      const progressArgs = ['-nostats', '-progress', 'pipe:1'];
      const cp = spawn(this.ffmpegBinary(), [...progressArgs, ...args]);
      let stderr = '';
      let buf = '';
      let lastPct = -1;
      let lastUpdateMs = 0;

      const maybeUpdateProgress = (pct: number) => {
        if (!job) return;
        const now = Date.now();
        if (pct <= lastPct) return;
        if (now - lastUpdateMs < 700 && pct < 100) return;
        lastPct = pct;
        lastUpdateMs = now;
        void job.updateProgress(pct).catch(() => undefined);
      };

      const durationUs =
        durationSec && Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec * 1_000_000) : null;

      cp.stdout.on('data', (chunk) => {
        if (!durationUs) return;
        buf += chunk.toString();
        let idx = buf.indexOf('\n');
        while (idx >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (line.startsWith('out_time_ms=')) {
            const val = Number(line.slice('out_time_ms='.length));
            if (Number.isFinite(val) && val >= 0) {
              const pct = Math.max(0, Math.min(99, Math.floor((val / durationUs) * 100)));
              maybeUpdateProgress(pct);
            }
          } else if (line === 'progress=end') {
            maybeUpdateProgress(100);
          }
          idx = buf.indexOf('\n');
        }
      });
      cp.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      cp.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `ffmpeg introuvable. Installez ffmpeg ou définissez FFMPEG_PATH (actuel: "${this.ffmpegBinary()}").`,
            ),
          );
          return;
        }
        reject(err);
      });
      cp.on('close', (code) => {
        if (code !== 0) return reject(new Error(stderr || `ffmpeg exited with code ${code}`));
        resolve();
      });
    });
  }

  private async listFilesRecursively(dir: string): Promise<string[]> {
    const entries = await readdir(dir);
    const files: string[] = [];
    for (const name of entries) {
      const abs = join(dir, name);
      const s = await stat(abs);
      if (s.isDirectory()) {
        files.push(...(await this.listFilesRecursively(abs)));
      } else {
        files.push(abs);
      }
    }
    return files;
  }

  private async uploadDirectoryToMinio(localDir: string, keyPrefix: string) {
    const files = await this.listFilesRecursively(localDir);
    const bucket = this.getBucket();
    for (const file of files) {
      const rel = relative(localDir, file).replace(/\\/g, '/');
      const key = `${keyPrefix}/${rel}`;
      const body = await readFile(file);
      const contentType = rel.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : rel.endsWith('.ts')
          ? 'video/mp2t'
          : 'application/octet-stream';
      await this.s3().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    }
  }

  private async markJob(assetId: string, status: 'running' | 'succeeded' | 'failed', lastError?: string) {
    await this.prisma.videoJob.updateMany({
      where: {
        assetId,
        type: 'transcode',
        status: { in: ['queued', 'running'] },
      },
      data: {
        status,
        lastError,
        ...(status === 'running' ? { startedAt: new Date(), attempts: { increment: 1 } } : {}),
        ...(status === 'succeeded' || status === 'failed' ? { finishedAt: new Date() } : {}),
      },
    });
  }

  private async handleTranscode(job: Job<TranscodeJobData>) {
    const { assetId } = job.data;
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        sourceObjectKey: true,
        contentId: true,
        episodeId: true,
        durationSec: true,
        width: true,
        height: true,
      },
    });
    if (!asset) throw new Error(`VideoAsset not found: ${assetId}`);

    // Récupérer le userId du créateur une seule fois
    const contentInfo = await this.prisma.content.findUnique({
      where: { id: asset.contentId },
      select: { title: true, creator: { select: { userId: true } } },
    });
    const creatorUserId = contentInfo?.creator?.userId ?? null;

    const emit = (pct: number) => {
      if (!creatorUserId) return;
      this.notificationsGateway.emitPipelineProgress(creatorUserId, assetId, 'transcode', pct, asset.episodeId);
    };

    await job.updateProgress(5);
    emit(5);
    await this.markJob(assetId, 'running');
    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: { status: 'TRANSCODING', errorCode: null, errorMessage: null },
    });

    let tempInputPath = '';
    const tempOutputDir = join(tmpdir(), `ivod-hls-${assetId}-${randomUUID()}`);
    try {
      tempInputPath = await this.downloadToTempFile(asset.sourceObjectKey);
      await job.updateProgress(10);
      await mkdir(tempOutputDir, { recursive: true });

      try {
        const durationGuess = asset.durationSec ?? 120;
        const seekSec = Math.min(20, Math.max(0.5, durationGuess * 0.08));
        const posterLocal = join(tempOutputDir, 'poster.jpg');
        await this.extractPosterFrame(tempInputPath, posterLocal, seekSec);
        const posterKey = `video/posters/${assetId}.jpg`;
        await this.s3().send(
          new PutObjectCommand({
            Bucket: this.getBucket(),
            Key: posterKey,
            Body: await readFile(posterLocal),
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=86400',
          }),
        );
        await this.prisma.videoAsset.update({
          where: { id: assetId },
          data: { posterObjectKey: posterKey },
        });
        const publicPoster = this.posterPublicUrl(posterKey);
        if (publicPoster) {
          if (asset.episodeId) {
            await this.prisma.episode.update({
              where: { id: asset.episodeId },
              data: { thumbnailUrl: publicPoster },
            });
          } else {
            await this.prisma.content.update({
              where: { id: asset.contentId },
              data: { thumbnailUrl: publicPoster },
            });
          }
        }
      } catch (posterErr) {
        const msg = posterErr instanceof Error ? posterErr.message : String(posterErr);
        this.logger.warn(`Poster non généré pour ${assetId} (transcode continue): ${msg}`);
      }

      const profiles = this.selectProfilesForSource(asset.width, asset.height);
      const ladderDetails = profiles
        .map((p) => `${p.name}:${p.width}x${p.height}@${Math.round(p.videoBitrate / 1000)}k`)
        .join(', ');
      this.logger.log(
        `Ladder transcode ${assetId}: ${ladderDetails} (source ${asset.width ?? '?'}x${asset.height ?? '?'})`,
      );
      const hasAudio = await this.probeHasAudio(tempInputPath);
      this.logger.log(`Asset ${assetId}: hasAudio=${hasAudio}`);
      await this.runFfmpegHls(tempInputPath, tempOutputDir, profiles, asset.durationSec, hasAudio, job);
      await job.updateProgress(90);
      emit(90);

      const keyPrefix = `video/hls/${assetId}`;
      await this.uploadDirectoryToMinio(tempOutputDir, keyPrefix);
      await job.updateProgress(95);
      emit(95);

      await this.prisma.$transaction([
        this.prisma.videoRendition.deleteMany({ where: { assetId } }),
        this.prisma.videoRendition.createMany({
          data: profiles.map((p, index) => ({
            assetId,
            name: p.name,
            width: p.width,
            height: p.height,
            videoBitrate: p.videoBitrate,
            audioBitrate: p.audioBitrate,
            playlistPath: `${keyPrefix}/v${index}/index.m3u8`,
          })),
        }),
      ]);

      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: { status: 'READY', manifestPath: `${keyPrefix}/master.m3u8` },
      });

      // Transition PROCESSING → READY sur le contenu ou l'épisode
      if (asset.episodeId) {
        await this.prisma.episode.update({
          where: { id: asset.episodeId },
          data: { status: { connect: { code: 'READY' } } },
        });
        // Promouvoir la série parente DRAFT → READY si au moins un épisode est READY
        const readyRef = await this.prisma.contentStatusRef.findUnique({ where: { code: 'READY' } });
        const draftRef = await this.prisma.contentStatusRef.findUnique({ where: { code: 'DRAFT' } });
        if (readyRef && draftRef) {
          await this.prisma.content.updateMany({
            where: { id: asset.contentId, statusId: draftRef.id },
            data: { statusId: readyRef.id },
          });
        }
      } else {
        await this.prisma.content.update({
          where: { id: asset.contentId },
          data: { status: { connect: { code: 'READY' } } },
        });
      }

      await job.updateProgress(100);
      emit(100);

      try {
        if (contentInfo?.creator?.userId) {
          const episodeTitle = asset.episodeId
            ? (await this.prisma.episode.findUnique({
                where: { id: asset.episodeId },
                select: { title: true, season: true, episode: true },
              }))
            : null;
          const displayTitle = episodeTitle
            ? `${contentInfo.title} — S${episodeTitle.season}E${episodeTitle.episode} ${episodeTitle.title}`
            : contentInfo.title;
          await this.notificationsService.create(
            contentInfo.creator.userId,
            'video_ready',
            'Video prete a etre publiee',
            `Votre contenu "${displayTitle}" est pret. Il sera visible apres validation de l'equipe.`,
            { contentId: asset.contentId, assetId, episodeId: asset.episodeId ?? null },
          );
          this.notificationsGateway.emitVideoReady(contentInfo.creator.userId, asset.contentId, displayTitle);
        }
      } catch (notifyErr) {
        const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
        this.logger.warn(`Notification video_ready non envoyee pour ${assetId}: ${msg}`);
      }

      await this.markJob(assetId, 'succeeded');
      return { assetId, manifestPath: `${keyPrefix}/master.m3u8` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcode failed';
      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: { status: 'FAILED', errorCode: 'TRANSCODE_FAILED', errorMessage: message },
      });
      try {
        if (contentInfo?.creator?.userId) {
          await this.notificationsService.create(
            contentInfo.creator.userId,
            'video_failed',
            'Echec transcodage video',
            `Le transcodage de "${contentInfo.title}" a echoue. Vous pouvez relancer le pipeline.`,
            { contentId: asset.contentId, assetId, episodeId: asset.episodeId ?? null, href: '/creator/contenus' },
          );
        }
      } catch {
        // Non bloquant.
      }
      // Supprimer les sorties HLS partielles laissées sur MinIO
      await this.uploads.deletePipelineOutputs(assetId).catch((cleanErr) => {
        const msg = cleanErr instanceof Error ? cleanErr.message : String(cleanErr);
        this.logger.warn(`Nettoyage MinIO partiel échoué pour ${assetId}: ${msg}`);
      });

      await this.markJob(assetId, 'failed', message);
      throw error;
    } finally {
      if (tempInputPath) {
        await unlink(tempInputPath).catch(() => undefined);
      }
      await rm(tempOutputDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }
}

