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
import { ALLOWED_IMAGE_MIME_TYPES } from '../../common/constants/upload-mime-types';
import { resolveUserHasStaffRole } from '../../common/helpers/user-roles.helper';
import { resolveProfilesForSource, resolvePriorityForPlan } from './video-pipeline.constants';
import { VideoPipelineSettingsService } from './video-pipeline-settings.service';
import {
  buildHlsDeliveryUrl,
  resolvePlaybackTokenTtl,
} from './video-playback-delivery';
import {
  downloadTokenExpiresAt,
  resolveDownloadPlaybackTokenTtl,
} from '../downloads/download-playback.constants';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private pipeline: VideoPipelineService,
    private config: ConfigService,
    private jwt: JwtService,
    private pipelineSettings: VideoPipelineSettingsService,
  ) {}

  /**
   * Base publique utilisée pour fabriquer les URLs de lecture (proxy HLS, sous-titres, storyboard).
   *
   * En dev, "localhost" ne désigne pas la même machine pour un navigateur (même hôte que l'API)
   * et pour un appareil mobile (qui joint l'API via son IP LAN) : une base statique casse l'un
   * des deux. On dérive donc la base du `Host` réellement utilisé par le client pour nous joindre
   * — chaque client reçoit alors des URLs qu'il peut effectivement résoudre.
   *
   * `API_PUBLIC_URL` reste un override explicite pour la prod (domaine fixe derrière CDN/proxy).
   */
  private resolveApiBase(req?: Request): string {
    const explicit = this.config.get<string>('API_PUBLIC_URL')?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const host = req?.get('host');
    if (host) return `${req!.protocol}://${host}/api/v1`;

    return `http://localhost:${this.config.get('PORT', '3000')}/api/v1`;
  }

  /** Secret dédié pour les playback tokens HLS (fallback JWT_SECRET pour rétrocompat). */
  private playbackSecret(): string {
    return (
      this.config.get<string>('PLAYBACK_JWT_SECRET') ??
      this.config.get<string>('JWT_SECRET') ??
      'change-me'
    );
  }

  private signPlaybackToken(
    userId: string,
    contentId: string,
    episodeId?: string | null,
  ): string {
    return this.jwt.sign(
      { sub: userId, purpose: 'playback', cid: contentId, eid: episodeId ?? null },
      { expiresIn: resolvePlaybackTokenTtl(), secret: this.playbackSecret() },
    );
  }

  /** Jeton longue durée pour télécharger tous les segments HLS d'une licence offline. */
  signDownloadPlaybackToken(
    userId: string,
    contentId: string,
    episodeId?: string | null,
    downloadId?: string,
  ): string {
    return this.jwt.sign(
      {
        sub: userId,
        purpose: 'download',
        cid: contentId,
        eid: episodeId ?? null,
        did: downloadId ?? null,
      },
      { expiresIn: resolveDownloadPlaybackTokenTtl(), secret: this.playbackSecret() },
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
    apiBase: string,
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
        ? this.buildEpisodeMediaUrl(apiBase, episodeId, t.objectKey, playbackToken)
        : this.buildMediaUrl(apiBase, contentId, t.objectKey, playbackToken),
      isDefault: t.isDefault,
    }));

    const storyboard =
      asset?.storyboardSpriteKey && asset?.storyboardVttKey
        ? {
            spriteUrl: episodeId
              ? this.buildEpisodeMediaUrl(apiBase, episodeId, asset.storyboardSpriteKey, playbackToken)
              : this.buildMediaUrl(apiBase, contentId, asset.storyboardSpriteKey, playbackToken),
            vttUrl: episodeId
              ? this.buildEpisodeMediaUrl(apiBase, episodeId, asset.storyboardVttKey, playbackToken)
              : this.buildMediaUrl(apiBase, contentId, asset.storyboardVttKey, playbackToken),
          }
        : null;

    return { subtitleTracks, storyboard };
  }

  private buildMediaUrl(
    apiBase: string,
    contentId: string,
    objectKey: string,
    playbackToken?: string,
  ): string {
    if (!playbackToken) {
      return `${apiBase}/videos/${contentId}/media?path=${encodeURIComponent(objectKey)}`;
    }
    return buildHlsDeliveryUrl({
      apiBase,
      contentId,
      objectKey,
      playbackToken,
    });
  }

  private buildEpisodeMediaUrl(
    apiBase: string,
    episodeId: string,
    objectKey: string,
    playbackToken?: string,
  ): string {
    if (!playbackToken) {
      return `${apiBase}/videos/episodes/${episodeId}/media?path=${encodeURIComponent(objectKey)}`;
    }
    return buildHlsDeliveryUrl({
      apiBase,
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

  /**
   * Vérifie un token de lecture HLS.
   *
   * Sécurité :
   * - Signé avec un secret dédié (PLAYBACK_JWT_SECRET, fallback JWT_SECRET) → un access
   *   token d'authentification normal n'est PAS accepté comme playback token.
   * - Le claim `purpose: 'playback'` est vérifié.
   * - Le `contentId`/`episodeId` du token est vérifié contre celui de l'URL pour empêcher
   *   le replay d'un token légitime sur un autre contenu.
   */
  async verifyPlaybackToken(
    token?: string,
    expectedContentId?: string,
    expectedEpisodeId?: string,
  ): Promise<{ userId: string; contentId: string | null; episodeId: string | null }> {
    if (!token?.trim()) {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Token requis' });
    }
    try {
      const payload = this.jwt.verify<{
        sub: string;
        purpose?: string;
        cid?: string | null;
        eid?: string | null;
      }>(token, { secret: this.playbackSecret() });
      if (!payload?.sub) throw new Error('invalid');
      if (payload.purpose !== 'playback' && payload.purpose !== 'download') {
        throw new Error('wrong purpose');
      }
      if (expectedContentId && payload.cid && payload.cid !== expectedContentId) {
        throw new Error('content mismatch');
      }
      if (expectedEpisodeId && payload.eid && payload.eid !== expectedEpisodeId) {
        throw new Error('episode mismatch');
      }
      return {
        userId: payload.sub,
        contentId: payload.cid ?? null,
        episodeId: payload.eid ?? null,
      };
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
    apiBase: string,
    body: string,
    contentId: string,
    manifestKey: string,
    playbackToken: string,
  ): string {
    const buildUrl = (key: string) => this.buildMediaUrl(apiBase, contentId, key, playbackToken);
    return body
      .split('\n')
      .map((line) => this.rewriteM3u8Line(line, manifestKey, buildUrl))
      .join('\n');
  }

  private rewriteEpisodeM3u8(
    apiBase: string,
    body: string,
    episodeId: string,
    manifestKey: string,
    playbackToken: string,
  ): string {
    const buildUrl = (key: string) =>
      this.buildEpisodeMediaUrl(apiBase, episodeId, key, playbackToken);
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
    const req = res.req as Request;
    // Même base que celle reçue par le client dans `playbackUrl` — garantit que les segments
    // et sous-manifestes réécrits restent joignables depuis le même hôte (LAN, localhost, prod).
    const apiBase = this.resolveApiBase(req);
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
        this.rewriteM3u8(apiBase, buffer.toString('utf-8'), contentId, key, playbackToken),
        'utf-8',
      );
      res.setHeader('Content-Type', this.contentTypeForKey(key));
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
      return;
    }

    await this.pipeStorageObject(this.minio.bucketVideos, key, res, req);
  }

  async streamEpisodeMedia(
    episodeId: string,
    objectPath: string,
    userId: string,
    res: Response,
    playbackToken: string,
    jwtRoles?: string[],
  ): Promise<void> {
    const req = res.req as Request;
    const apiBase = this.resolveApiBase(req);
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
    if (!exists) {
      this.logger.warn(`Media introuvable episode=${episodeId} key=${key}`);
      throw new NotFoundException({ code: 'ASSET_002', message: 'Fichier introuvable' });
    }

    if (key.endsWith('.m3u8')) {
      let buffer = await this.minio.getObjectBuffer(this.minio.bucketVideos, key);
      buffer = Buffer.from(
        this.rewriteEpisodeM3u8(apiBase, buffer.toString('utf-8'), episodeId, key, playbackToken),
        'utf-8',
      );
      res.setHeader('Content-Type', this.contentTypeForKey(key));
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
      return;
    }

    await this.pipeStorageObject(this.minio.bucketVideos, key, res, req);
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
    const isSegment = key.endsWith('.ts') || key.endsWith('.m4s') || key.endsWith('.vtt');
    const cacheControl = key.endsWith('.ts')
      ? 'public, max-age=31536000, immutable'
      : 'private, max-age=3600';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req?.headers?.range;
    // Segments HLS : certains clients envoient des Range peu compatibles avec MinIO/proxy.
    // Les segments sont petits → streamer l'objet complet est plus robuste.
    if (!isSegment && typeof range === 'string' && range.startsWith('bytes=') && size > 0) {
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

  /**
   * Taille de partie multipart adaptée au poids du fichier. À 10 Mo fixes,
   * un film de 20 Go = ~2000 parties = ~2000 requêtes HTTP distinctes sur
   * une connexion créateur potentiellement instable — chacune est un point
   * de défaillance possible. Des parties plus grosses pour les gros
   * fichiers réduisent ce nombre tout en restant loin des limites S3/MinIO
   * (10 000 parties max, 5 Go max par partie).
   */
  private static readonly PART_SIZE_TIERS: Array<{ maxFileSizeBytes: number; partSizeBytes: number }> = [
    { maxFileSizeBytes: 2 * 1024 * 1024 * 1024, partSizeBytes: 10 * 1024 * 1024 }, // ≤2 Go → 10 Mo
    { maxFileSizeBytes: 10 * 1024 * 1024 * 1024, partSizeBytes: 25 * 1024 * 1024 }, // ≤10 Go → 25 Mo
    { maxFileSizeBytes: 30 * 1024 * 1024 * 1024, partSizeBytes: 50 * 1024 * 1024 }, // ≤30 Go → 50 Mo
  ];
  private static readonly DEFAULT_LARGE_PART_SIZE_BYTES = 100 * 1024 * 1024; // >30 Go → 100 Mo

  private computeMultipartPartSize(fileSizeBytes?: number): number {
    if (!fileSizeBytes || fileSizeBytes <= 0) {
      return VideosService.PART_SIZE_TIERS[0].partSizeBytes;
    }
    const tier = VideosService.PART_SIZE_TIERS.find((t) => fileSizeBytes <= t.maxFileSizeBytes);
    return tier ? tier.partSizeBytes : VideosService.DEFAULT_LARGE_PART_SIZE_BYTES;
  }

  private objectKey(prefix: string, mimeType?: string) {
    // Avant ce correctif, un mimeType inconnu retombait silencieusement sur
    // l'extension .mp4 sans jamais rejeter la requête — la table MIME_TO_EXT
    // servait de mapping d'extension, pas d'allowlist appliquée. Un mimeType
    // absent (undefined) reste toléré (comportement existant, extension par
    // défaut .mp4), seul un mimeType EXPLICITEMENT hors liste est rejeté.
    if (mimeType && !VideosService.MIME_TO_EXT[mimeType]) {
      throw new BadRequestException({
        code: 'ASSET_002',
        message: `Type de fichier vidéo non autorisé : ${mimeType}`,
      });
    }
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
  async initMultipartUpload(
    userId: string,
    contentId: string,
    mimeType?: string,
    fileSizeBytes?: number,
  ) {
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
      partSizeBytes: this.computeMultipartPartSize(fileSizeBytes),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      message: 'Uploader chaque partie via multipart/part-url puis multipart/complete',
    };
  }

  /** Upload multipart reprise (gros fichiers) — init, variante épisode */
  async initEpisodeMultipartUpload(
    userId: string,
    episodeId: string,
    mimeType?: string,
    fileSizeBytes?: number,
  ) {
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

    const uploadId = await this.minio.initiateMultipartUpload(
      this.minio.bucketVideos,
      objectKey,
    );

    return {
      assetId: asset.id,
      uploadId,
      objectKey,
      bucket: this.minio.bucketVideos,
      contentId: episode.contentId,
      episodeId,
      partSizeBytes: this.computeMultipartPartSize(fileSizeBytes),
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

    // Priorité BullMQ selon le plan actif (PREMIUM → 1, BASIC → 5, FREE → 10)
    const activeSub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      include: { plan: { select: { code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const planCode = (activeSub?.plan as { code: string } | undefined)?.code ?? 'FREE';
    const priority = resolvePriorityForPlan(planCode);

    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: {
        status: VideoAssetStatus.UPLOADED,
        ...(meta?.durationSec ? { durationSec: meta.durationSec } : {}),
      },
    });

    await this.pipeline.createPipelineFlow(assetId, { priority });

    return { assetId, status: VideoAssetStatus.UPLOADED, message: 'Upload validé, transcodage en cours' };
  }

  async getSignedPlaybackUrl(contentId: string, userId: string, jwtRoles?: string[], req?: Request) {
    const apiBase = this.resolveApiBase(req);
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
        return this.getSignedPlaybackUrlForEpisode(episodeAsset.episodeId, userId, jwtRoles, req);
      }
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Aucune vidéo disponible pour ce contenu' });
    }

    const objectKey = asset.manifestPath ?? asset.sourceObjectKey;
    const isHls = objectKey.endsWith('.m3u8');
    const playbackToken = this.signPlaybackToken(userId, contentId, null);
    const playbackUrl = isHls
      ? this.buildMediaUrl(apiBase, contentId, objectKey, playbackToken)
      : await this.minio.presignedGetUrl(this.minio.bucketVideos, objectKey);

    const extras = await this.buildPlaybackExtras(apiBase, contentId, null, playbackToken, asset as any);

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

  async getSignedPlaybackUrlForEpisode(
    episodeId: string,
    userId: string,
    jwtRoles?: string[],
    req?: Request,
  ) {
    const apiBase = this.resolveApiBase(req);
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
    const playbackToken = this.signPlaybackToken(
      userId,
      (episode as any).content.id,
      episodeId,
    );
    const playbackUrl = isHls
      ? this.buildEpisodeMediaUrl(apiBase, episodeId, objectKey, playbackToken)
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
      apiBase,
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

  /**
   * Package offline : master HLS (ou MP4) + jeton longue durée pour le cache segments côté mobile.
   */
  async buildOfflineDownloadPackage(params: {
    userId: string;
    contentId: string;
    episodeId?: string | null;
    quality?: string;
    downloadId: string;
    req?: Request;
  }) {
    const { userId, contentId, episodeId, downloadId, req } = params;
    const apiBase = this.resolveApiBase(req);

    const asset = episodeId
      ? await this.prisma.videoAsset.findFirst({
          where: {
            episodeId,
            status: { in: [...PLAYABLE_VIDEO_STATUSES] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            manifestPath: true,
            sourceObjectKey: true,
            muxPlaybackId: true,
          },
        })
      : (
          await this.prisma.content.findUnique({
            where: { id: contentId },
            include: {
              videoAssets: {
                where: { episodeId: null, status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  manifestPath: true,
                  sourceObjectKey: true,
                  muxPlaybackId: true,
                },
              },
            },
          })
        )?.videoAssets?.[0];

    if (!asset) {
      throw new NotFoundException({
        code: 'DOWNLOAD_006',
        message: 'Aucune vidéo téléchargeable pour ce contenu',
      });
    }

    const objectKey = asset.manifestPath ?? asset.sourceObjectKey;
    if (!objectKey) {
      throw new NotFoundException({
        code: 'DOWNLOAD_006',
        message: 'Fichier vidéo introuvable',
      });
    }

    const isHls = objectKey.endsWith('.m3u8');
    const playbackToken = this.signDownloadPlaybackToken(
      userId,
      contentId,
      episodeId,
      downloadId,
    );
    const tokenExpiresAt = downloadTokenExpiresAt();

    if (isHls) {
      const masterManifestUrl = episodeId
        ? buildHlsDeliveryUrl({
            apiBase,
            contentId: '',
            episodeId,
            objectKey,
            playbackToken,
          })
        : buildHlsDeliveryUrl({
            apiBase,
            contentId,
            objectKey,
            playbackToken,
          });

      return {
        format: 'HLS' as const,
        assetId: asset.id,
        manifestObjectKey: objectKey,
        masterManifestUrl,
        playbackToken,
        tokenExpiresAt,
      };
    }

    const mp4Url = asset.muxPlaybackId
      ? `https://stream.mux.com/${asset.muxPlaybackId}.m3u8`
      : await this.minio.presignedGetUrl(this.minio.bucketVideos, objectKey, 4 * 3600);

    return {
      format: 'MP4' as const,
      assetId: asset.id,
      manifestObjectKey: objectKey,
      masterManifestUrl: mp4Url,
      playbackToken,
      tokenExpiresAt,
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

    // Avant ce correctif : aucune allowlist, n'importe quel mimeType était
    // accepté tel quel (même faille que media-assets.service.ts, corrigée
    // séparément — cette méthode est un chemin d'upload d'asset parallèle).
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException({
        code: 'ASSET_002',
        message: `Type de fichier non autorisé : ${mimeType}`,
      });
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
        previewAvailable: false,
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

    const completedProfiles = [
      ...new Set(asset?.renditions?.map((r) => r.name).filter(Boolean) ?? []),
    ];
    // Une fois la phase 2 (qualité complète) démarrée, `prepareTranscode`
    // repasse le statut à TRANSCODING — ce qui masquait à tort l'aperçu déjà
    // publié (rendition preview toujours présente en base, juste ignorée ici
    // car on ne regardait que le statut instantané). Corrigé le 2026-07-03.
    const previewAvailable = completedProfiles.length > 0;
    const playable = ['READY_PREVIEW', 'READY', 'PUBLISHED'].includes(assetStatus) || previewAvailable;

    const sourceHeight = asset?.height ?? 1080;
    // Doit refléter le même plafond que celui réellement appliqué par le
    // worker (VideoPipelineSettingsService.resolveMaxQualityHeightForAsset)
    // — sans ça, la liste "attendue" incluait toujours 1440p/2160p même une
    // fois le plafond ramené à 1080p, laissant deux badges "en cours" qui ne
    // se terminaient jamais côté UI. Corrigé le 2026-07-03.
    const maxAllowedHeight = asset
      ? await this.pipelineSettings.resolveMaxQualityHeightForAsset(asset.id)
      : Infinity;
    const expectedProfiles = resolveProfilesForSource(sourceHeight, maxAllowedHeight).map(
      (p) => p.name,
    );
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
      previewAvailable,
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

  /** Relance le pipeline après un échec (créateur propriétaire du contenu). */
  async retryFailedPipeline(assetId: string, userId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        content: { include: { creator: true } },
      },
    });
    if (!asset) {
      throw new NotFoundException({ code: 'ASSET_001', message: 'Ressource vidéo introuvable' });
    }
    if (asset.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    if (asset.status !== VideoAssetStatus.FAILED) {
      throw new BadRequestException({
        code: 'PIPELINE_003',
        message: 'Seul un encodage en échec peut être relancé',
      });
    }

    const exists = await this.minio.exists(this.minio.bucketVideos, asset.sourceObjectKey);
    if (!exists) {
      throw new BadRequestException({
        code: 'ASSET_002',
        message: 'Fichier source introuvable — ré-uploadez la vidéo',
      });
    }

    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: { status: VideoAssetStatus.UPLOADED, errorMessage: null },
    });
    await this.pipeline.enqueueProbe(assetId);

    return {
      assetId,
      status: VideoAssetStatus.UPLOADED,
      message: 'Encodage relancé',
    };
  }
}
