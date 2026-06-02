import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { VideoAssetStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { VideoPipelineService } from './video-pipeline.service';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { PLAYABLE_VIDEO_STATUSES } from '../../common/constants/video-playback';
import { resolveUserHasStaffRole } from '../../common/helpers/user-roles.helper';
import { resolveProfilesForSource } from './video-pipeline.constants';
import {
  buildHlsDeliveryUrl,
  resolvePlaybackTokenTtl,
} from './video-playback-delivery';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private pipeline: VideoPipelineService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  private apiPublicBase(): string {
    const base =
      this.config.get<string>('API_PUBLIC_URL') ??
      `http://localhost:${this.config.get('PORT', '3000')}/api/v1`;
    return base.replace(/\/$/, '');
  }

  private signPlaybackToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, purpose: 'playback' },
      { expiresIn: resolvePlaybackTokenTtl() },
    );
  }

  private playbackTokenExpiresAt(): string {
    const ttl = resolvePlaybackTokenTtl();
    const sec = ttl.match(/^(\d+)s$/);
    if (sec) return new Date(Date.now() + parseInt(sec[1], 10) * 1000).toISOString();
    if (ttl.endsWith('m')) {
      return new Date(Date.now() + parseInt(ttl, 10) * 60 * 1000).toISOString();
    }
    if (ttl.endsWith('h')) {
      return new Date(Date.now() + parseInt(ttl, 10) * 3600 * 1000).toISOString();
    }
    return new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  private async buildPlaybackExtras(
    contentId: string,
    episodeId: string | null | undefined,
    playbackToken: string,
    asset?: {
      storyboardSpriteKey: string | null;
      storyboardVttKey: string | null;
    } | null,
  ) {
    const tracks = await this.prisma.subtitleTrack.findMany({
      where: { contentId, episodeId: episodeId ?? null },
      include: { language: { select: { code: true, label: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const subtitleTracks = tracks.map((t) => ({
      id: t.id,
      label: t.language.label,
      language: t.language.code,
      objectKey: t.objectKey,
      src: episodeId
        ? this.buildEpisodeMediaUrl(episodeId, t.objectKey, playbackToken)
        : this.buildMediaUrl(contentId, t.objectKey, playbackToken),
      isDefault: t.isDefault,
    }));

    const storyboard =
      asset?.storyboardSpriteKey && asset?.storyboardVttKey
        ? {
            spriteUrl: episodeId
              ? this.buildEpisodeMediaUrl(episodeId, asset.storyboardSpriteKey, playbackToken)
              : this.buildMediaUrl(contentId, asset.storyboardSpriteKey, playbackToken),
            vttUrl: episodeId
              ? this.buildEpisodeMediaUrl(episodeId, asset.storyboardVttKey, playbackToken)
              : this.buildMediaUrl(contentId, asset.storyboardVttKey, playbackToken),
          }
        : null;

    return { subtitleTracks, storyboard };
  }

  private buildMediaUrl(contentId: string, objectKey: string, playbackToken?: string): string {
    if (!playbackToken) {
      return `${this.apiPublicBase()}/videos/${contentId}/media?path=${encodeURIComponent(objectKey)}`;
    }
    return buildHlsDeliveryUrl({
      apiBase: this.apiPublicBase(),
      contentId,
      objectKey,
      playbackToken,
    });
  }

  private buildEpisodeMediaUrl(
    episodeId: string,
    objectKey: string,
    playbackToken?: string,
  ): string {
    if (!playbackToken) {
      return `${this.apiPublicBase()}/videos/episodes/${episodeId}/media?path=${encodeURIComponent(objectKey)}`;
    }
    return buildHlsDeliveryUrl({
      apiBase: this.apiPublicBase(),
      contentId: '',
      episodeId,
      objectKey,
      playbackToken,
    });
  }

  /** Clé MinIO : chemins déjà absolus (hls/assetId/…) ou relatifs au dossier du manifeste. */
  private normalizeHlsObjectKey(line: string, manifestKey: string): string {
    const trimmed = line.trim().replace(/^\/+/, '');
    if (!trimmed) return trimmed;
    if (
      trimmed.startsWith('hls/') ||
      trimmed.startsWith('subtitles/') ||
      trimmed.startsWith('storyboards/')
    ) {
      return trimmed.replace(/\/+/g, '/');
    }
    const baseDir = manifestKey.includes('/')
      ? manifestKey.replace(/\/[^/]+$/, '')
      : '';
    if (!baseDir) return trimmed.replace(/\/+/g, '/');
    return `${baseDir}/${trimmed}`.replace(/\/+/g, '/');
  }

  async verifyPlaybackToken(token?: string): Promise<string> {
    if (!token?.trim()) {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Token requis' });
    }
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      if (!payload?.sub) throw new Error('invalid');
      return payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Token invalide' });
    }
  }

  private rewriteM3u8Line(
    line: string,
    manifestKey: string,
    buildUrl: (objectKey: string) => string,
  ): string {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/, (_m, uri: string) => {
        if (uri.startsWith('http://') || uri.startsWith('https://')) return `URI="${uri}"`;
        const normalized = this.normalizeHlsObjectKey(uri, manifestKey);
        return `URI="${buildUrl(normalized)}"`;
      });
    }
    if (!trimmed || trimmed.startsWith('#')) return line;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return line;
    const normalized = this.normalizeHlsObjectKey(trimmed, manifestKey);
    return buildUrl(normalized);
  }

  private rewriteM3u8(
    body: string,
    contentId: string,
    manifestKey: string,
    playbackToken: string,
  ): string {
    const buildUrl = (key: string) => this.buildMediaUrl(contentId, key, playbackToken);
    return body
      .split('\n')
      .map((line) => this.rewriteM3u8Line(line, manifestKey, buildUrl))
      .join('\n');
  }

  private rewriteEpisodeM3u8(
    body: string,
    episodeId: string,
    manifestKey: string,
    playbackToken: string,
  ): string {
    const buildUrl = (key: string) =>
      this.buildEpisodeMediaUrl(episodeId, key, playbackToken);
    return body
      .split('\n')
      .map((line) => this.rewriteM3u8Line(line, manifestKey, buildUrl))
      .join('\n');
  }

  private contentTypeForKey(objectKey: string): string {
    if (objectKey.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (objectKey.endsWith('.ts')) return 'video/mp2t';
    if (objectKey.endsWith('.vtt')) return 'text/vtt';
    if (objectKey.endsWith('.mp4') || objectKey.endsWith('.m4v')) return 'video/mp4';
    return 'application/octet-stream';
  }

  async streamContentMedia(
    contentId: string,
    objectPath: string,
    userId: string,
    res: Response,
    playbackToken: string,
  ): Promise<void> {
    await this.assertContentPlaybackAccess(contentId, userId, undefined);
    const key = objectPath.replace(/^\/+/, '');
    if (!key || key.includes('..')) {
      throw new BadRequestException({ code: 'ASSET_003', message: 'Chemin média invalide' });
    }
    const exists = await this.minio.exists(this.minio.bucketVideos, key);
    if (!exists) {
      this.logger.warn(`Media introuvable content=${contentId} key=${key}`);
      throw new NotFoundException({ code: 'ASSET_002', message: 'Fichier introuvable' });
    }

    if (key.endsWith('.m3u8')) {
      let buffer = await this.minio.getObjectBuffer(this.minio.bucketVideos, key);
      buffer = Buffer.from(
        this.rewriteM3u8(buffer.toString('utf-8'), contentId, key, playbackToken),
        'utf-8',
      );
      res.setHeader('Content-Type', this.contentTypeForKey(key));
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
      return;
    }

    await this.pipeStorageObject(this.minio.bucketVideos, key, res, res.req as Request);
  }

  async streamEpisodeMedia(
    episodeId: string,
    objectPath: string,
    userId: string,
    res: Response,
    playbackToken: string,
    jwtRoles?: string[],
  ): Promise<void> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        contentId: true,
        status: { select: { code: true } },
        content: {
          select: {
            id: true,
            uploadedByUserId: true,
            creator: { select: { userId: true } },
          },
        },
      },
    });
    if (!episode) throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    await this.assertEpisodePlaybackAccess(episode, userId, jwtRoles);

    const key = objectPath.replace(/^\/+/, '');
    if (!key || key.includes('..')) {
      throw new BadRequestException({ code: 'ASSET_003', message: 'Chemin média invalide' });
    }
    const exists = await this.minio.exists(this.minio.bucketVideos, key);
    if (!exists) throw new NotFoundException({ code: 'ASSET_002', message: 'Fichier introuvable' });

    if (key.endsWith('.m3u8')) {
      let buffer = await this.minio.getObjectBuffer(this.minio.bucketVideos, key);
      buffer = Buffer.from(
        this.rewriteEpisodeM3u8(buffer.toString('utf-8'), episodeId, key, playbackToken),
        'utf-8',
      );
      res.setHeader('Content-Type', this.contentTypeForKey(key));
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
      return;
    }

    await this.pipeStorageObject(this.minio.bucketVideos, key, res, res.req as Request);
  }

  /** Stream MinIO avec support Range (segments .ts) — évite de charger tout en RAM. */
  private async pipeStorageObject(
    bucket: string,
    key: string,
    res: Response,
    req?: Request,
  ): Promise<void> {
    const stat = await this.minio.statObject(bucket, key);
    const size = stat.size;
    const contentType = this.contentTypeForKey(key);
    const cacheControl = key.endsWith('.ts')
      ? 'public, max-age=31536000, immutable'
      : 'private, max-age=3600';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req?.headers?.range;
    if (typeof range === 'string' && range.startsWith('bytes=') && size > 0) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : size - 1;
        if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end && start < size) {
          const safeEnd = Math.min(end, size - 1);
          const chunkSize = safeEnd - start + 1;
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${safeEnd}/${size}`);
          res.setHeader('Content-Length', String(chunkSize));
          res.setHeader('Content-Type', contentType);
          const stream = await this.minio.getPartialObjectStream(
            bucket,
            key,
            start,
            chunkSize,
          );
          stream.pipe(res);
          return;
        }
      }
    }

    res.status(200);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Content-Type', contentType);
    const stream = await this.minio.getObjectStream(bucket, key);
    stream.pipe(res);
  }

  private async assertContentPlaybackAccess(
    contentId: string,
    userId: string,
    jwtRoles?: string[],
  ): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    // Staff et admin passent toujours
    if (await resolveUserHasStaffRole(this.prisma, userId, jwtRoles)) return;

    const statusCode = content.status?.code;
    if (statusCode === 'DRAFT' || statusCode === 'BLOCKED') {
      const isOwner =
        content.uploadedByUserId === userId || content.creator?.userId === userId;
      if (!isOwner) throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu non disponible' });
      return;
    }

    // Le créateur peut toujours accéder à son propre contenu
    const isOwner = content.uploadedByUserId === userId || content.creator?.userId === userId;
    if (isOwner) return;

    const visibilityCode = content.visibility?.code;

    if (visibilityCode === 'PRIVATE') {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu privé' });
    }

    if (visibilityCode === 'SUBSCRIBERS_ONLY') {
      const activeSub = await this.prisma.userSubscription.findFirst({
        where: { userId, status: { code: 'ACTIVE' } },
      });
      if (!activeSub) {
        throw new ForbiddenException({ code: 'CONTENT_004', message: 'Abonnement requis pour accéder à ce contenu' });
      }
    }

    if (visibilityCode === 'PPV') {
      const paid = await this.prisma.payment.findFirst({
        where: {
          userId,
          contentId,
          status: { code: 'COMPLETED' },
          refunds: { none: { status: { code: 'PROCESSED' } } },
        },
      });
      if (!paid) {
        throw new ForbiddenException({ code: 'CONTENT_005', message: 'Achat requis pour accéder à ce contenu' });
      }
    }
  }

  private async assertEpisodePlaybackAccess(
    episode: {
      status?: { code: string } | null;
      content: {
        id: string;
        uploadedByUserId: string | null;
        creator?: { userId: string } | null;
      };
    },
    userId: string,
    jwtRoles?: string[],
  ): Promise<void> {
    await this.assertContentPlaybackAccess(episode.content.id, userId, jwtRoles);
    if (await resolveUserHasStaffRole(this.prisma, userId, jwtRoles)) return;
    const isOwner =
      episode.content.uploadedByUserId === userId ||
      episode.content.creator?.userId === userId;
    if (isOwner) return;
    if (episode.status?.code !== 'PUBLISHED') {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Épisode non disponible' });
    }
  }

  private static readonly MIME_TO_EXT: Record<string, string> = {
    'video/mp4':         'mp4',
    'video/quicktime':   'mov',
    'video/x-matroska':  'mkv',
    'video/webm':        'webm',
    'video/x-msvideo':   'avi',
    'video/mp2t':        'ts',
    'video/x-flv':       'flv',
    'video/x-m4v':       'm4v',
    'video/3gpp':        '3gp',
    'video/x-ms-wmv':    'wmv',
  };

  private objectKey(prefix: string, mimeType?: string) {
    const ext = (mimeType && VideosService.MIME_TO_EXT[mimeType]) ?? 'mp4';
    return `${prefix}/${randomUUID()}.${ext}`;
  }

  async createDirectUpload(userId: string, contentId: string, mimeType?: string) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });
    if (!content || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Contenu introuvable ou accès refusé' });
    }

    const objectKey = this.objectKey(`videos/contents/${contentId}`, mimeType);

    const asset = await this.prisma.videoAsset.create({
      data: {
        contentId,
        sourceObjectKey: objectKey,
        status: VideoAssetStatus.CREATED,
      },
    });

    const uploadUrl = await this.minio.presignedPutUrl(this.minio.bucketVideos, objectKey);

    return {
      assetId: asset.id,
      uploadUrl,
      objectKey,
      bucket: this.minio.bucketVideos,
      contentId,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /** Upload multipart reprise (gros fichiers) — init */
  async initMultipartUpload(userId: string, contentId: string, mimeType?: string) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Contenu introuvable ou accès refusé' });
    }

    const objectKey = this.objectKey(`videos/contents/${contentId}`, mimeType);
    const asset = await this.prisma.videoAsset.create({
      data: {
        contentId,
        sourceObjectKey: objectKey,
        status: VideoAssetStatus.CREATED,
      },
    });

    const uploadId = await this.minio.initiateMultipartUpload(
      this.minio.bucketVideos,
      objectKey,
    );

    return {
      assetId: asset.id,
      uploadId,
      objectKey,
      bucket: this.minio.bucketVideos,
      contentId,
      partSizeBytes: 10 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      message: 'Uploader chaque partie via multipart/part-url puis multipart/complete',
    };
  }

  async getMultipartPartUrl(
    userId: string,
    assetId: string,
    uploadId: string,
    partNumber: number,
  ) {
    const asset = await this.assertAssetOwner(userId, assetId);
    if (partNumber < 1 || partNumber > 10_000) {
      throw new BadRequestException({ code: 'UPLOAD_001', message: 'Numéro de partie invalide' });
    }
    const uploadUrl = await this.minio.presignedMultipartPartUrl(
      this.minio.bucketVideos,
      asset.sourceObjectKey,
      uploadId,
      partNumber,
    );
    return { uploadUrl, partNumber, uploadId, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() };
  }

  async completeMultipartUpload(
    userId: string,
    assetId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ) {
    const asset = await this.assertAssetOwner(userId, assetId);
    if (!parts?.length) {
      throw new BadRequestException({ code: 'UPLOAD_002', message: 'Aucune partie fournie' });
    }
    await this.minio.completeMultipartUpload(
      this.minio.bucketVideos,
      asset.sourceObjectKey,
      uploadId,
      parts.map((p) => ({ part: p.partNumber, etag: p.etag })),
    );
    return this.markUploadComplete(assetId, userId, {});
  }

  private async assertAssetOwner(userId: string, assetId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: { content: { include: { creator: true } } },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Asset introuvable' });
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator || asset.content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    return asset;
  }

  async createEpisodeDirectUpload(userId: string, episodeId: string, mimeType?: string) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { content: { include: { creator: true } } },
    });
    if (!episode || episode.content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Épisode introuvable ou accès refusé' });
    }

    const objectKey = this.objectKey(`videos/episodes/${episodeId}`, mimeType);

    const asset = await this.prisma.videoAsset.create({
      data: {
        contentId: episode.contentId,
        episodeId,
        sourceObjectKey: objectKey,
        status: VideoAssetStatus.CREATED,
      },
    });

    const uploadUrl = await this.minio.presignedPutUrl(this.minio.bucketVideos, objectKey);

    return {
      assetId: asset.id,
      uploadUrl,
      objectKey,
      bucket: this.minio.bucketVideos,
      contentId: episode.contentId,
      episodeId,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /** Appelé par le frontend après upload réussi dans MinIO */
  async markUploadComplete(assetId: string, userId: string, meta?: { durationSec?: number }) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        content: { include: { creator: true, status: { select: { code: true } } } },
      },
    });

    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Ressource vidéo introuvable' });
    if (asset.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    // Vérifier que l'objet existe bien dans MinIO
    const exists = await this.minio.exists(this.minio.bucketVideos, asset.sourceObjectKey);
    if (!exists) {
      throw new BadRequestException({ code: 'ASSET_002', message: "Fichier introuvable dans le stockage — l'upload a peut-être échoué" });
    }

    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: {
        status: VideoAssetStatus.UPLOADED,
        ...(meta?.durationSec ? { durationSec: meta.durationSec } : {}),
      },
    });

    await this.pipeline.enqueueProbe(assetId);

    return { assetId, status: VideoAssetStatus.UPLOADED, message: 'Upload validé, transcodage en cours' };
  }

  async getSignedPlaybackUrl(contentId: string, userId: string, jwtRoles?: string[]) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
        videoAssets: {
          where: { episodeId: null, status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sourceObjectKey: true,
            manifestPath: true,
            status: true,
            episodeId: true,
            storyboardSpriteKey: true,
            storyboardVttKey: true,
          },
        },
      },
    });

    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const isStaff = await resolveUserHasStaffRole(this.prisma, userId, jwtRoles);
    const statusCode = (content as any).status?.code;
    if (!isStaff && (statusCode === 'DRAFT' || statusCode === 'BLOCKED')) {
      const isOwner =
        content.uploadedByUserId === userId || content.creator?.userId === userId;
      if (!isOwner) throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu non disponible' });
    }

    const assets = (content as any).videoAssets as Array<{
      sourceObjectKey: string;
      manifestPath: string | null;
      status: string;
      episodeId: string | null;
    }>;
    const isOwner =
      content.uploadedByUserId === userId || content.creator?.userId === userId;
    const asset =
      isStaff || isOwner
        ? assets[0]
        : (assets.find((a) => a.status !== 'READY_PREVIEW') ?? assets[0]);

    if (!asset) {
      const episodeAsset = await this.prisma.videoAsset.findFirst({
        where: {
          contentId,
          episodeId: { not: null },
          status: { in: [...PLAYABLE_VIDEO_STATUSES] },
        },
        orderBy: { createdAt: 'desc' },
        select: { episodeId: true },
      });
      if (episodeAsset?.episodeId) {
        return this.getSignedPlaybackUrlForEpisode(episodeAsset.episodeId, userId, jwtRoles);
      }
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Aucune vidéo disponible pour ce contenu' });
    }

    const objectKey = asset.manifestPath ?? asset.sourceObjectKey;
    const isHls = objectKey.endsWith('.m3u8');
    const playbackToken = this.signPlaybackToken(userId);
    const playbackUrl = isHls
      ? this.buildMediaUrl(contentId, objectKey, playbackToken)
      : await this.minio.presignedGetUrl(this.minio.bucketVideos, objectKey);

    const extras = await this.buildPlaybackExtras(contentId, null, playbackToken, asset as any);

    return {
      playbackUrl,
      url: playbackUrl,
      playbackToken: isHls ? playbackToken : undefined,
      format: isHls ? 'HLS' : 'MP4',
      useToken: isHls,
      expiresAt: this.playbackTokenExpiresAt(),
      assetId: (asset as any).id,
      ...extras,
    };
  }

  async getSignedPlaybackUrlForEpisode(episodeId: string, userId: string, jwtRoles?: string[]) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: {
          select: {
            id: true,
            uploadedByUserId: true,
            creator: { select: { userId: true } },
            visibility: { select: { code: true } },
          },
        },
        videoAssets: {
          where: { status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sourceObjectKey: true,
            manifestPath: true,
            storyboardSpriteKey: true,
            storyboardVttKey: true,
          },
        },
      },
    });

    if (!episode) throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });

    const asset = (episode as any).videoAssets[0];
    if (!asset) throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });

    const objectKey = asset.manifestPath ?? asset.sourceObjectKey;
    const isHls = objectKey.endsWith('.m3u8');
    const playbackToken = this.signPlaybackToken(userId);
    const playbackUrl = isHls
      ? this.buildEpisodeMediaUrl(episodeId, objectKey, playbackToken)
      : await this.minio.presignedGetUrl(this.minio.bucketVideos, objectKey);

    const episodeWithContent = episode as typeof episode & {
      content: { id: string; uploadedByUserId: string | null; creator?: { userId: string } | null };
      videoAssets: Array<{
        id: string;
        sourceObjectKey: string;
        manifestPath: string | null;
        storyboardSpriteKey: string | null;
        storyboardVttKey: string | null;
      }>;
    };

    await this.assertEpisodePlaybackAccess(episodeWithContent, userId, jwtRoles);

    const extras = await this.buildPlaybackExtras(
      episodeWithContent.content.id,
      episodeId,
      playbackToken,
      asset,
    );

    return {
      playbackUrl,
      url: playbackUrl,
      playbackToken: isHls ? playbackToken : undefined,
      format: isHls ? 'HLS' : 'MP4',
      useToken: isHls,
      expiresAt: this.playbackTokenExpiresAt(),
      assetId: asset.id,
      ...extras,
    };
  }

  /** Presigned PUT URL pour un asset media (thumbnail, poster…) */
  async createAssetUploadUrl(userId: string, contentId: string, assetType: string, mimeType: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    const ext = mimeType.split('/')[1] ?? 'jpg';
    const objectKey = `assets/${assetType}/${contentId}/${randomUUID()}.${ext}`;

    const uploadUrl = await this.minio.presignedPutUrl(this.minio.bucketAssets, objectKey);

    return {
      uploadUrl,
      objectKey,
      bucket: this.minio.bucketAssets,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async getUploadStatus(contentId: string) {
    return this.resolveUploadStatus({ contentId, episodeId: null });
  }

  async getEpisodeUploadStatus(episodeId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { contentId: true },
    });
    if (!episode) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
    return this.resolveUploadStatus({ contentId: episode.contentId, episodeId });
  }

  private async resolveUploadStatus(params: { contentId: string; episodeId: string | null }) {
    const { contentId, episodeId } = params;

    const asset = await this.prisma.videoAsset.findFirst({
      where: episodeId ? { episodeId } : { contentId, episodeId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        durationSec: true,
        height: true,
        sourceObjectKey: true,
        posterObjectKey: true,
        storyboardSpriteKey: true,
        storyboardVttKey: true,
        manifestPath: true,
        errorMessage: true,
        renditions: { select: { name: true, height: true }, orderBy: { height: 'asc' } },
        jobs: {
          where: { status: { in: ['PENDING', 'RUNNING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, status: true },
        },
      },
    });

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { status: { select: { code: true } } },
    });

    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    if (!asset) {
      return {
        contentId,
        episodeId,
        assetId: null,
        contentStatus: (content as any).status?.code,
        assetStatus: null,
        status: 'PENDING_UPLOAD',
        playable: false,
        progress: { percentage: 0, currentStep: 'pending_upload' },
        durationSec: null,
        errorMessage: null,
        pipeline: {
          completedProfiles: [] as string[],
          remainingProfiles: [] as string[],
          activeJobType: null,
        },
      };
    }

    const statusMap: Record<string, number> = {
      CREATED: 0,
      UPLOADED: 15,
      PROBING: 20,
      TRANSCODING: 45,
      PACKAGING: 55,
      READY_PREVIEW: 72,
      READY: 100,
      PUBLISHED: 100,
      FAILED: 0,
    };
    const assetStatus = asset?.status ?? 'CREATED';
    const playable = ['READY_PREVIEW', 'READY', 'PUBLISHED'].includes(assetStatus);

    const completedProfiles = [
      ...new Set(asset?.renditions?.map((r) => r.name).filter(Boolean) ?? []),
    ];
    const sourceHeight = asset?.height ?? 1080;
    const expectedProfiles = resolveProfilesForSource(sourceHeight).map((p) => p.name);
    const remainingProfiles = expectedProfiles.filter((p) => !completedProfiles.includes(p));

    const activeJob = asset?.jobs?.[0];

    return {
      contentId,
      episodeId,
      assetId: asset?.id ?? null,
      contentStatus: (content as any).status?.code,
      assetStatus,
      status: assetStatus,
      playable,
      progress: { percentage: statusMap[assetStatus] ?? 0, currentStep: assetStatus.toLowerCase() },
      durationSec: asset?.durationSec ?? null,
      posterObjectKey: asset?.posterObjectKey ?? null,
      storyboardSpriteKey: asset?.storyboardSpriteKey ?? null,
      storyboardVttKey: asset?.storyboardVttKey ?? null,
      manifestPath: asset?.manifestPath ?? null,
      errorMessage: asset?.errorMessage ?? null,
      pipeline: {
        completedProfiles,
        remainingProfiles:
          assetStatus === 'TRANSCODING' || assetStatus === 'READY_PREVIEW' || assetStatus === 'PACKAGING'
            ? remainingProfiles
            : [],
        activeJobType: activeJob?.type ?? null,
      },
    };
  }
}
