import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Mux from '@mux/mux-node';
import { Prisma } from '@prisma/client';
import { posix } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isEpisodicContentType,
  normalizeContentTypeCode,
  getContentTypeIdCandidates,
} from '../../common/helpers/content-type.helper';
import {
  CONTENT_STATUS,
  CONTENT_VISIBILITY,
  PLAN_CODE,
  SUBSCRIPTION_STATUS,
  CONTENT_TYPE,
} from '../../common/constants/content.constants';
import { CreateEpisodeUploadDto, CreateUploadDto } from './dto/videos.dto';
import { UploadsService } from '../uploads/uploads.service';
import { MediaAssetsService } from '../media-assets/media-assets.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VideosService {
  private mux: Mux;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private uploads: UploadsService,
    private mediaAssets: MediaAssetsService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
  ) {
    this.mux = new Mux({
      tokenId: this.config.get('MUX_TOKEN_ID')!,
      tokenSecret: this.config.get('MUX_TOKEN_SECRET')!,
    });
  }

  private notifyAdminsNewContent(contentId: string, title: string, contentTypeCode: string) {
    const typeLabel = isEpisodicContentType(contentTypeCode) ? 'série / web-série' : 'contenu';
    void this.notifications
      .notifyAdmins(
        'admin_new_content',
        'Nouveau contenu créé',
        `Le créateur a ajouté ${typeLabel} : « ${title} ».`,
        {
          contentId,
          href: `/admin/contenus/${contentId}?title=${encodeURIComponent(title)}`,
        },
      )
      .catch(() => undefined);
  }

  private notifyAdminsNewEpisode(
    contentId: string,
    contentTitle: string,
    ep: { id: string; season: number; episode: number; title: string },
  ) {
    const epLabel = `S${ep.season}E${ep.episode} — ${ep.title}`;
    void this.notifications
      .notifyAdmins(
        'admin_new_episode',
        'Nouvel épisode',
        `Nouvel épisode pour « ${contentTitle} » : ${epLabel}.`,
        {
          contentId,
          episodeId: ep.id,
          href: `/admin/contenus/${contentId}?title=${encodeURIComponent(contentTitle)}&tab=episodes`,
        },
      )
      .catch(() => undefined);
  }

  private assertMuxTokens(): void {
    const tokenId = this.config.get<string>('MUX_TOKEN_ID')?.trim();
    const tokenSecret = this.config.get<string>('MUX_TOKEN_SECRET')?.trim();
    if (!tokenId || !tokenSecret) {
      throw new ServiceUnavailableException({
        code: 'MUX_CONFIG',
        message:
          'Upload vidéo indisponible : configurez MUX_TOKEN_ID et MUX_TOKEN_SECRET sur l’API (fichier .env).',
      });
    }
  }

  /** Crée un upload direct Mux ; erreurs réseau / identifiants → 503 lisible pour le client. */
  private async createMuxDirectUpload() {
    this.assertMuxTokens();
    try {
      return await this.mux.video.uploads.create({
        cors_origin: this.config.get('FRONTEND_URL') ?? '*',
        new_asset_settings: {
          playback_policy: ['signed'],
          encoding_tier: 'smart',
        },
      });
    } catch (err: unknown) {
      const hint =
        err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException({
        code: 'MUX_UPSTREAM',
        message:
          'Mux n’a pas pu créer l’upload (identifiants invalides, quota ou réseau). Vérifiez MUX_TOKEN_ID, MUX_TOKEN_SECRET et que l’API atteint api.mux.com.',
        details: process.env.NODE_ENV === 'development' ? hint : undefined,
      });
    }
  }

  /** `minio` (défaut) = chaîne interne presign MinIO ; `mux` = upload direct Mux. */
  getUploadProvider(): 'minio' | 'mux' {
    const raw = (this.config.get<string>('VIDEO_UPLOAD_PROVIDER') ?? 'minio').trim().toLowerCase();
    return raw === 'mux' ? 'mux' : 'minio';
  }

  /** `proxy` (défaut) = URL API + réécriture playlists ; `presign` = URL signée master seul (segments fragiles). */
  private useHlsPresignMode(): boolean {
    return (this.config.get<string>('HLS_PLAYBACK_MODE') ?? 'proxy').trim().toLowerCase() === 'presign';
  }

  private getHlsPlaybackSecret(): string {
    const explicit = this.config.get<string>('HLS_PLAYBACK_SECRET')?.trim();
    if (explicit) return explicit;
    const jwtSecret = this.config.get<string>('JWT_SECRET')?.trim();
    if (!jwtSecret) {
      throw new ServiceUnavailableException({
        code: 'HLS_CONFIG',
        message: 'Configurez JWT_SECRET ou HLS_PLAYBACK_SECRET pour émettre les jetons de lecture HLS.',
      });
    }
    return jwtSecret;
  }

  private signHlsPlaybackToken(userId: string, assetId: string): string {
    const secret = this.getHlsPlaybackSecret();
    return this.jwtService.sign(
      { scope: 'hls-playback', aid: assetId },
      { secret, subject: userId, expiresIn: '45m' },
    );
  }

  private verifyHlsPlaybackToken(pt: string, expectedAssetId: string): string {
    const secret = this.getHlsPlaybackSecret();
    try {
      const payload = this.jwtService.verify<{ scope?: string; aid?: string; sub?: string }>(pt, { secret });
      if (payload.scope !== 'hls-playback' || payload.aid !== expectedAssetId) {
        throw new UnauthorizedException({ code: 'HLS_003', message: 'Jeton de lecture invalide.' });
      }
      const sub = typeof payload.sub === 'string' ? payload.sub : '';
      if (!sub) {
        throw new UnauthorizedException({ code: 'HLS_003', message: 'Jeton de lecture invalide.' });
      }
      return sub;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({ code: 'HLS_003', message: 'Jeton de lecture invalide ou expiré.' });
    }
  }

  private getApiPublicBaseTrimmed(): string {
    return (this.config.get<string>('API_PUBLIC_URL') ?? '').trim().replace(/\/+$/, '');
  }

  private buildHlsProxyBaseForAsset(assetId: string): string {
    const apiBase = this.getApiPublicBaseTrimmed();
    if (!apiBase) {
      throw new ServiceUnavailableException({
        code: 'API_PUBLIC_URL',
        message:
          'Pour la lecture HLS en mode proxy, définissez API_PUBLIC_URL (ex. https://api.example.com). Sinon activez HLS_PLAYBACK_MODE=presign.',
      });
    }
    return `${apiBase}/api/v1/videos/hls-proxy/${assetId}`;
  }

  private sanitizeHlsRelativePath(raw: string): string {
    const n = String(raw || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .trim();
    if (!n || n.includes('..')) {
      throw new BadRequestException({ code: 'HLS_001', message: 'Chemin média invalide.' });
    }
    return n;
  }

  private static readonly DEFAULT_MINIO_QUALITIES = ['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];

  private getMinioQualitiesFromRenditions(
    renditions: Array<{ name: string; height?: number | null }> | null | undefined,
  ): string[] {
    if (!renditions?.length) return [...VideosService.DEFAULT_MINIO_QUALITIES];
    const names = renditions
      .map((r) => String(r.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => {
        const ah = Number.parseInt(a.replace(/\D/g, ''), 10);
        const bh = Number.parseInt(b.replace(/\D/g, ''), 10);
        if (Number.isFinite(ah) && Number.isFinite(bh)) return ah - bh;
        return a.localeCompare(b);
      });
    return names.length ? names : [...VideosService.DEFAULT_MINIO_QUALITIES];
  }

  private guessStoredObjectContentType(key: string): string {
    if (key.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (key.endsWith('.ts')) return 'video/mp2t';
    if (key.endsWith('.m4s')) return 'video/iso.segment';
    return 'application/octet-stream';
  }

  private rewriteHlsPlaylistManifest(body: string, proxyBaseUrl: string, pt: string, currentPath: string): string {
    const cur = currentPath.replace(/\\/g, '/');
    return body
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        if (trimmed.includes('://')) return line;
        const resolved = posix.normalize(posix.join(posix.dirname(cur), trimmed)).replace(/^\//, '');
        if (!resolved || resolved.includes('..')) return line;
        const u = new URL(proxyBaseUrl);
        u.searchParams.set('path', resolved);
        u.searchParams.set('pt', pt);
        return u.toString();
      })
      .join('\n');
  }

  private requireMinioFileMeta(dto: { uploadFilename?: string; uploadContentType?: string }): {
    filename: string;
    contentType: string;
  } {
    const filename = dto.uploadFilename?.trim();
    const contentType = dto.uploadContentType?.trim();
    if (!filename || !contentType) {
      throw new BadRequestException({
        code: 'VIDEO_004',
        message:
          'Avec VIDEO_UPLOAD_PROVIDER=minio, envoyez uploadFilename et uploadContentType (nom et type MIME du fichier).',
      });
    }
    return { filename, contentType };
  }

  private async getActivePlanCode(userId: string): Promise<string> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: SUBSCRIPTION_STATUS.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true } } },
    });
    return (activeSub?.plan?.code as string | undefined) ?? PLAN_CODE.FREE;
  }

  private async getContentStatusId(code: string) {
    const ref = await this.prisma.contentStatusRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Status inconnu: ${code}` });
    return ref.id;
  }

  private async getContentTypeId(code: string) {
    for (const candidate of getContentTypeIdCandidates(code)) {
      const byTypeCode = await this.prisma.contentTypeRef.findUnique({ where: { typeCode: candidate } });
      if (byTypeCode) return byTypeCode.id;

      // Fallback for legacy seeds / existing DB rows.
      const byCode = await this.prisma.contentTypeRef.findUnique({ where: { code: candidate } });
      if (byCode) return byCode.id;
    }

    throw new NotFoundException({ code: 'REF_001', message: `Type inconnu: ${code}` });
  }

  private async getContentVisibilityId(code: string) {
    const ref = await this.prisma.contentVisibilityRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Visibility inconnue: ${code}` });
    return ref.id;
  }

  private async createDirectUploadMinio(userId: string, role: string, dto: CreateUploadDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const { filename, contentType } = this.requireMinioFileMeta(dto);

    if (dto.contentId) {
      const existing = await this.prisma.content.findUnique({
        where: { id: dto.contentId },
        include: {
          creator: true,
          contentType: { select: { code: true, typeCode: true } },
          status: { select: { code: true } },
        },
      });
      if (!existing || existing.creatorId !== creator.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Contenu introuvable ou accès refusé' });
      }
      if (isEpisodicContentType(existing.contentType.typeCode ?? existing.contentType.code)) {
        throw new BadRequestException({
          code: 'CONTENT_008',
          message:
            'Pour une série/web-série, ajoutez chaque épisode via POST /videos/episodes/upload-url (ou équivalent MinIO).',
        });
      }
      const init = await this.mediaAssets.initUpload(userId, role, {
        contentId: dto.contentId,
        filename,
        contentType,
        sizeBytes: dto.uploadSizeBytes,
      });
      await this.prisma.content.update({
        where: { id: dto.contentId },
        data: { statusId: await this.getContentStatusId(CONTENT_STATUS.UPLOADING) },
      });
      return {
        provider: 'minio' as const,
        contentId: existing.id,
        assetId: init.id,
        upload: init.upload,
      };
    }

    if (isEpisodicContentType(dto.contentType)) {
      throw new BadRequestException({
        code: 'CONTENT_009',
        message:
          'Créez d’abord la série/web-série (POST /contents avec contentType SERIES/WEB_SERIES), puis ajoutez chaque épisode via POST /videos/episodes/upload-url.',
      });
    }

    const categoryCode = (dto.category ?? '').trim().toUpperCase();
    const newContentTypeCode = normalizeContentTypeCode(dto.contentType ?? CONTENT_TYPE.SINGLE) || CONTENT_TYPE.SINGLE;
    const [contentTypeId, statusId, visibilityId] = await Promise.all([
      this.getContentTypeId(newContentTypeCode),
      this.getContentStatusId(CONTENT_STATUS.UPLOADING),
      this.getContentVisibilityId(CONTENT_VISIBILITY.PUBLIC),
    ]);
    const rightsholder = await this.prisma.rightsholder.findUnique({
      where: { id: dto.primaryRightsholderId! },
      select: { id: true },
    });
    if (!rightsholder) {
      throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    }
    const content = await this.prisma.content.create({
      data: {
        creatorId: creator.id,
        uploadedByUserId: userId,
        primaryRightsholderId: dto.primaryRightsholderId!,
        distributorId: dto.distributorId,
        title: dto.title!,
        categoryId: (
          await this.prisma.category.upsert({
            where: { code: categoryCode },
            update: { label: categoryCode },
            create: { code: categoryCode, label: categoryCode },
          })
        ).id,
        description: dto.description,
        contentTypeId,
        statusId,
        visibilityId,
        tags: [],
      },
    });
    this.notifyAdminsNewContent(content.id, content.title, newContentTypeCode);

    try {
      const init = await this.mediaAssets.initUpload(userId, role, {
        contentId: content.id,
        filename,
        contentType,
        sizeBytes: dto.uploadSizeBytes,
      });
      return {
        provider: 'minio' as const,
        contentId: content.id,
        assetId: init.id,
        upload: init.upload,
      };
    } catch (err) {
      await this.prisma.content.delete({ where: { id: content.id } }).catch(() => undefined);
      throw err;
    }
  }

  private async createEpisodeDirectUploadMinio(userId: string, role: string, dto: CreateEpisodeUploadDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const { filename, contentType } = this.requireMinioFileMeta(dto);

    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
      include: { creator: true, contentType: { select: { code: true, typeCode: true } } },
    });
    if (!content || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Série introuvable ou accès refusé' });
    }
    if (!isEpisodicContentType(content.contentType.typeCode ?? content.contentType.code)) {
      throw new BadRequestException({
        code: 'CONTENT_010',
        message: 'Les uploads épisode concernent uniquement les contenus de type SERIES/WEB_SERIES.',
      });
    }

    const slotTaken = await this.prisma.episode.findFirst({
      where: { contentId: dto.contentId, season: dto.season, episode: dto.episode },
      select: { id: true },
    });
    if (slotTaken) {
      throw new ConflictException({
        code: 'EPISODE_DUPLICATE',
        message:
          'Un épisode existe déjà pour cette saison et ce numéro. Changez le numéro d’épisode ou supprimez l’existant.',
      });
    }

    const episode = await this.prisma.episode.create({
      data: {
        contentId: content.id,
        seasonId: dto.seasonId ?? null,
        title: dto.title,
        description: dto.description,
        season: dto.season,
        episode: dto.episode,
        duration: dto.duration ?? 0,
        thumbnailUrl: dto.thumbnailUrl,
        statusId: await this.getContentStatusId(CONTENT_STATUS.UPLOADING),
      },
    });
    this.notifyAdminsNewEpisode(content.id, content.title, episode);

    try {
      const init = await this.mediaAssets.initUpload(userId, role, {
        episodeId: episode.id,
        filename,
        contentType,
        sizeBytes: dto.uploadSizeBytes,
      });
      return {
        provider: 'minio' as const,
        contentId: content.id,
        episodeId: episode.id,
        assetId: init.id,
        upload: init.upload,
      };
    } catch (err) {
      await this.prisma.episode.delete({ where: { id: episode.id } }).catch(() => undefined);
      throw err;
    }
  }

  async createDirectUpload(userId: string, role: string, dto: CreateUploadDto) {
    if (this.getUploadProvider() === 'minio') {
      return this.createDirectUploadMinio(userId, role, dto);
    }

    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const upload = await this.createMuxDirectUpload();

    if (dto.contentId) {
      const existing = await this.prisma.content.findUnique({
        where: { id: dto.contentId },
        include: {
          creator: true,
          contentType: { select: { code: true, typeCode: true } },
          status: { select: { code: true } },
        },
      });
      if (!existing || existing.creatorId !== creator.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Contenu introuvable ou accès refusé' });
      }
      if (isEpisodicContentType(existing.contentType.typeCode ?? existing.contentType.code)) {
        throw new BadRequestException({
          code: 'CONTENT_008',
          message: 'Pour une série/web-série, utilisez POST /videos/episodes/upload-url pour chaque épisode.',
        });
      }
      await this.prisma.content.update({
        where: { id: dto.contentId },
        data: { muxUploadId: upload.id, statusId: await this.getContentStatusId(CONTENT_STATUS.UPLOADING) },
      });
      return {
        provider: 'mux' as const,
        uploadId: upload.id,
        uploadUrl: upload.url,
        contentId: existing.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        maxFileSizeMb: 2048,
        acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    }

    if (isEpisodicContentType(dto.contentType)) {
      throw new BadRequestException({
        code: 'CONTENT_009',
        message:
          'Créez d’abord la série/web-série (POST /contents avec contentType SERIES/WEB_SERIES), puis ajoutez chaque épisode via POST /videos/episodes/upload-url.',
      });
    }

    const categoryCode = (dto.category ?? '').trim().toUpperCase();
    const newContentTypeCode = normalizeContentTypeCode(dto.contentType ?? CONTENT_TYPE.SINGLE) || CONTENT_TYPE.SINGLE;
    const [contentTypeId, statusId, visibilityId] = await Promise.all([
      this.getContentTypeId(newContentTypeCode),
      this.getContentStatusId(CONTENT_STATUS.UPLOADING),
      this.getContentVisibilityId(CONTENT_VISIBILITY.PUBLIC),
    ]);
    const rightsholder = await this.prisma.rightsholder.findUnique({
      where: { id: dto.primaryRightsholderId! },
      select: { id: true },
    });
    if (!rightsholder) {
      throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    }
    const content = await this.prisma.content.create({
      data: {
        creatorId: creator.id,
        uploadedByUserId: userId,
        primaryRightsholderId: dto.primaryRightsholderId!,
        distributorId: dto.distributorId,
        title: dto.title!,
        categoryId: (
          await this.prisma.category.upsert({
            where: { code: categoryCode },
            update: { label: categoryCode },
            create: { code: categoryCode, label: categoryCode },
          })
        ).id,
        description: dto.description,
        contentTypeId,
        statusId,
        visibilityId,
        muxUploadId: upload.id,
        tags: [],
      },
    });
    this.notifyAdminsNewContent(content.id, content.title, newContentTypeCode);

    return {
      provider: 'mux' as const,
      uploadId: upload.id,
      uploadUrl: upload.url,
      contentId: content.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      maxFileSizeMb: 2048,
      acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
    };
  }

  async createEpisodeDirectUpload(userId: string, role: string, dto: CreateEpisodeUploadDto) {
    if (this.getUploadProvider() === 'minio') {
      return this.createEpisodeDirectUploadMinio(userId, role, dto);
    }

    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
      include: { creator: true, contentType: { select: { code: true, typeCode: true } } },
    });
    if (!content || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Série introuvable ou accès refusé' });
    }
    if (!isEpisodicContentType(content.contentType.typeCode ?? content.contentType.code)) {
      throw new BadRequestException({
        code: 'CONTENT_010',
        message: 'Les uploads épisode concernent uniquement les contenus de type SERIES/WEB_SERIES.',
      });
    }

    const slotTaken = await this.prisma.episode.findFirst({
      where: { contentId: dto.contentId, season: dto.season, episode: dto.episode },
      select: { id: true },
    });
    if (slotTaken) {
      throw new ConflictException({
        code: 'EPISODE_DUPLICATE',
        message:
          'Un épisode existe déjà pour cette saison et ce numéro. Changez le numéro d’épisode ou supprimez l’existant.',
      });
    }

    const upload = await this.createMuxDirectUpload();

    try {
      const episode = await this.prisma.episode.create({
        data: {
          contentId: content.id,
          seasonId: dto.seasonId ?? null,
          title: dto.title,
          description: dto.description,
          season: dto.season,
          episode: dto.episode,
          duration: dto.duration ?? 0,
          thumbnailUrl: dto.thumbnailUrl,
          muxUploadId: upload.id,
          statusId: await this.getContentStatusId(CONTENT_STATUS.UPLOADING),
        },
      });
      this.notifyAdminsNewEpisode(content.id, content.title, episode);

      return {
        provider: 'mux' as const,
        uploadId: upload.id,
        uploadUrl: upload.url,
        contentId: content.id,
        episodeId: episode.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        maxFileSizeMb: 2048,
        acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          code: 'EPISODE_DUPLICATE',
          message:
            'Un épisode existe déjà pour cette saison et ce numéro. Changez le numéro d’épisode ou supprimez l’existant.',
        });
      }
      throw e;
    }
  }

  async getSignedPlaybackUrl(contentId: string, userId: string, userRole = 'USER') {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });

    if (!content) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const isOwner = content.creator.userId === userId;
    const canPreview = isOwner || userRole === 'ADMIN';

    if (!canPreview && content.status.code !== CONTENT_STATUS.PUBLISHED) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu en cours de traitement' });
    }

    // A private video can only be streamed by its owner creator.
    if (content.visibility.code === CONTENT_VISIBILITY.PRIVATE && !isOwner && userRole !== 'ADMIN') {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }

    const planCode = await this.getActivePlanCode(userId);
    if (content.visibility.code === CONTENT_VISIBILITY.PREMIUM_ONLY && planCode === PLAN_CODE.FREE) {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement Premium est requis pour accéder à ce contenu',
      });
    }
    if (content.visibility.code === CONTENT_VISIBILITY.PPV && planCode === PLAN_CODE.FREE) {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement est requis pour accéder à ce contenu PPV.',
      });
    }

    const latestReadyAsset = await this.prisma.videoAsset.findFirst({
      where: { contentId, status: { in: ['READY', 'PUBLISHED'] }, manifestPath: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        manifestPath: true,
        renditions: {
          select: { name: true, height: true },
          orderBy: { height: 'asc' },
        },
      },
    });

    if (latestReadyAsset?.manifestPath) {
      const recentView = await this.prisma.watchHistory.findFirst({
        where: {
          userId,
          contentId,
          lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!recentView) {
        await this.prisma.content.update({
          where: { id: contentId },
          data: { viewCount: { increment: 1 } },
        });
      }

      if (this.useHlsPresignMode()) {
        const signed = await this.uploads.presignGetByKey(latestReadyAsset.manifestPath, 60 * 30);
        const qualities = this.getMinioQualitiesFromRenditions(latestReadyAsset.renditions);
        return {
          playbackUrl: signed.getUrl,
          format: 'HLS',
          provider: 'MINIO',
          assetId: latestReadyAsset.id,
          hlsMode: 'presign' as const,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          qualities,
          drmProtected: false,
        };
      }

      const pt = this.signHlsPlaybackToken(userId, latestReadyAsset.id);
      const proxyBase = this.buildHlsProxyBaseForAsset(latestReadyAsset.id);
      const playbackUrl = `${proxyBase}?path=${encodeURIComponent('master.m3u8')}&pt=${encodeURIComponent(pt)}`;
      const qualities = this.getMinioQualitiesFromRenditions(latestReadyAsset.renditions);
      return {
        playbackUrl,
        format: 'HLS',
        provider: 'MINIO',
        assetId: latestReadyAsset.id,
        hlsMode: 'proxy' as const,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        qualities,
        drmProtected: false,
      };
    }

    if (!content.muxPlaybackId) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }

    const signingKeyId = this.config.get('MUX_SIGNING_KEY_ID')!;
    const signingPrivateKey = this.config.get('MUX_SIGNING_PRIVATE_KEY')!;

    const token = await this.mux.jwt.signPlaybackId(content.muxPlaybackId!, {
      type: 'video',
      expiration: '24h',
      keyId: signingKeyId,
      keySecret: signingPrivateKey,
      params: { viewer_id: userId },
    });

    // Incrémenter le viewCount une seule fois par user par 24h
    const recentView = await this.prisma.watchHistory.findFirst({
      where: {
        userId,
        contentId,
        lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recentView) {
      await this.prisma.content.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      playbackUrl: `https://stream.mux.com/${content.muxPlaybackId}.m3u8?token=${token}`,
      format: 'HLS',
      provider: 'MUX',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      qualities: ['240p', '480p', '720p', '1080p'],
      drmProtected: true,
    };
  }

  async getSignedPlaybackUrlByAsset(assetId: string, userId: string, userRole = 'USER') {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        content: {
          include: {
            creator: { select: { userId: true } },
            status: { select: { code: true } },
            visibility: { select: { code: true } },
          },
        },
        renditions: {
          select: { name: true, height: true },
          orderBy: { height: 'asc' },
        },
      },
    });
    if (!asset) throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    if (!asset.manifestPath || !['READY', 'PUBLISHED'].includes(asset.status)) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }
    const isOwner = asset.content.creator.userId === userId;
    const canPreview = isOwner || userRole === 'ADMIN';
    if (!canPreview && asset.content.status.code !== 'PUBLISHED') {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu en cours de traitement' });
    }
    if (asset.content.visibility.code === 'PRIVATE' && !isOwner && userRole !== 'ADMIN') {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }
    const planCode = await this.getActivePlanCode(userId);
    if (asset.content.visibility.code === 'PREMIUM_ONLY' && planCode === 'FREE') {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement Premium est requis pour accéder à ce contenu',
      });
    }
    if (asset.content.visibility.code === 'PPV' && planCode === 'FREE') {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement est requis pour accéder à ce contenu PPV.',
      });
    }

    if (this.useHlsPresignMode()) {
      const signed = await this.uploads.presignGetByKey(asset.manifestPath, 60 * 30);
      const qualities = this.getMinioQualitiesFromRenditions(asset.renditions);
      return {
        playbackUrl: signed.getUrl,
        format: 'HLS',
        provider: 'MINIO',
        assetId: asset.id,
        contentId: asset.contentId,
        hlsMode: 'presign' as const,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        qualities,
        drmProtected: false,
      };
    }

    const pt = this.signHlsPlaybackToken(userId, asset.id);
    const proxyBase = this.buildHlsProxyBaseForAsset(asset.id);
    const playbackUrl = `${proxyBase}?path=${encodeURIComponent('master.m3u8')}&pt=${encodeURIComponent(pt)}`;
    const qualities = this.getMinioQualitiesFromRenditions(asset.renditions);
    return {
      playbackUrl,
      format: 'HLS',
      provider: 'MINIO',
      assetId: asset.id,
      contentId: asset.contentId,
      hlsMode: 'proxy' as const,
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      qualities,
      drmProtected: false,
    };
  }

  async getUploadStatus(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { status: { select: { code: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const statusMap: Record<string, number> = {
      UPLOADING: 25,
      PROCESSING: 68,
      PUBLISHED: 100,
      REJECTED: 0,
    };

    return {
      contentId,
      status: content.status.code,
      progress: {
        percentage: statusMap[content.status.code] ?? 0,
        currentStep: content.status.code.toLowerCase(),
        steps: ['uploaded', 'encoding', 'packaging', 'ready'],
        estimatedSecondsRemaining: content.status.code === 'PROCESSING' ? 45 : 0,
      },
      ...(content.status.code === 'PUBLISHED' && {
        content: {
          id: content.id,
          title: content.title,
          duration: content.duration,
          thumbnailUrl: content.thumbnailUrl,
          muxPlaybackId: content.muxPlaybackId,
          publishedAt: content.publishedAt,
        },
      }),
    };
  }

  async requestDownload(userId: string, contentId: string) {
    const planCode = await this.getActivePlanCode(userId);
    if (planCode === PLAN_CODE.FREE) {
      throw new ForbiddenException({ code: 'SUB_001', message: 'Abonnement requis pour télécharger' });
    }

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: SUBSCRIPTION_STATUS.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      select: { currentPeriodEnd: true },
    });

    const downloadLimit = planCode === 'PREMIUM' ? 5 : 10;
    const activeDownloads = await this.prisma.download.count({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (activeDownloads >= downloadLimit) {
      throw new ForbiddenException({
        code: 'VIDEO_003',
        message: `Limite de téléchargements atteinte (${activeDownloads}/${downloadLimit}).`,
      });
    }

    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    const contentWithStatus = content
      ? await this.prisma.content.findUnique({
          where: { id: contentId },
          include: { status: { select: { code: true } } },
        })
      : null;
    if (!contentWithStatus || contentWithStatus.status.code !== CONTENT_STATUS.PUBLISHED) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const expiresAt = activeSub?.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const download = await this.prisma.download.create({
      data: { userId, contentId, quality: '720p', expiresAt },
    });

    const token = await this.mux.jwt.signPlaybackId(contentWithStatus.muxPlaybackId!, {
      type: 'video',
      expiration: '30d',
      keyId: this.config.get('MUX_SIGNING_KEY_ID')!,
      keySecret: this.config.get('MUX_SIGNING_PRIVATE_KEY')!,
    });

    return {
      downloadId: download.id,
      contentId,
      title: contentWithStatus.title,
      downloadUrl: `https://stream.mux.com/${contentWithStatus.muxPlaybackId}/medium.mp4?token=${token}`,
      quality: '720p',
      expiresAt,
      remainingDownloads: downloadLimit - activeDownloads - 1,
    };
  }

  verifyAndHandleMuxWebhook(rawBody: string, headers: Record<string, any>, webhookSecret: string) {
    this.mux.webhooks.verifySignature(rawBody, headers, webhookSecret);
  }

  async handleMuxWebhook(event: any) {
    const uploadId = event.data?.upload_id as string | undefined;

    if (event.type === 'video.asset.ready' && uploadId) {
      const processingStatusId = await this.getContentStatusId(CONTENT_STATUS.PROCESSING);
      const payload = {
        statusId: processingStatusId,
        muxAssetId: event.data.id as string,
        muxPlaybackId: event.data.playback_ids?.[0]?.id as string | undefined,
        duration: Math.round(event.data.duration as number),
      };

      const contentUpdated = await this.prisma.content.updateMany({
        where: { muxUploadId: uploadId },
        data: payload,
      });

      if (contentUpdated.count === 0) {
        await this.prisma.episode.updateMany({
          where: { muxUploadId: uploadId },
          data: payload,
        });
      }
    }

    if (event.type === 'video.asset.errored' && uploadId) {
      const rejectedStatusId = await this.getContentStatusId('REJECTED');
      await this.prisma.content.updateMany({
        where: { muxUploadId: uploadId },
        data: { statusId: rejectedStatusId },
      });
      await this.prisma.episode.updateMany({
        where: { muxUploadId: uploadId },
        data: { statusId: rejectedStatusId },
      });
    }
  }

  async getEpisodeUploadStatus(episodeId: string, userId: string) {
    const ep = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: { include: { creator: { select: { userId: true } } } },
      },
    });
    if (!ep) throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    if (ep.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    const statusMap: Record<string, number> = {
      UPLOADING: 25,
      PROCESSING: 68,
      PUBLISHED: 100,
      REJECTED: 0,
    };
    const code = ep.status.code;

    return {
      episodeId,
      contentId: ep.contentId,
      status: code,
      progress: {
        percentage: statusMap[code] ?? 0,
        currentStep: code.toLowerCase(),
        steps: ['uploaded', 'encoding', 'packaging', 'ready'],
        estimatedSecondsRemaining: code === 'PROCESSING' ? 45 : 0,
      },
      ...(code === 'PUBLISHED' && {
        episode: {
          id: ep.id,
          title: ep.title,
          duration: ep.duration,
          thumbnailUrl: ep.thumbnailUrl,
          muxPlaybackId: ep.muxPlaybackId,
          publishedAt: ep.publishedAt,
        },
      }),
    };
  }

  async getSignedPlaybackUrlForEpisode(episodeId: string, userId: string, userRole = 'USER') {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: {
          include: {
            creator: { select: { userId: true } },
            status: { select: { code: true } },
            visibility: { select: { code: true } },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    }

    const isAdmin = userRole === 'ADMIN';
    const isOwner = episode.content.creator.userId === userId;
    const canPreview = isAdmin || isOwner;

    if (!canPreview) {
      if (episode.status.code !== CONTENT_STATUS.PUBLISHED || episode.content.status.code !== CONTENT_STATUS.PUBLISHED) {
        throw new ForbiddenException({ code: 'CONTENT_003', message: 'Épisode indisponible' });
      }
      if (episode.content.visibility.code === CONTENT_VISIBILITY.PRIVATE) {
        throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
      }
      const planCode = await this.getActivePlanCode(userId);
      if (episode.content.visibility.code === CONTENT_VISIBILITY.PREMIUM_ONLY && planCode === PLAN_CODE.FREE) {
        throw new ForbiddenException({
          code: 'CONTENT_004',
          message: 'Un abonnement Premium est requis pour accéder à ce contenu',
        });
      }
      if (episode.content.visibility.code === CONTENT_VISIBILITY.PPV && planCode === PLAN_CODE.FREE) {
        throw new ForbiddenException({
          code: 'CONTENT_004',
          message: 'Un abonnement est requis pour accéder à ce contenu PPV.',
        });
      }
    }

    const latestReadyAsset = await this.prisma.videoAsset.findFirst({
      where: { episodeId: episode.id, status: { in: ['READY', 'PUBLISHED'] }, manifestPath: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        manifestPath: true,
        renditions: {
          select: { name: true, height: true },
          orderBy: { height: 'asc' },
        },
      },
    });
    if (latestReadyAsset?.manifestPath) {
      if (!canPreview) {
        const recentView = await this.prisma.watchHistory.findFirst({
          where: {
            userId,
            contentId: episode.contentId,
            episodeId: episode.id,
            lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!recentView) {
          await this.prisma.episode.update({
            where: { id: episodeId },
            data: { viewCount: { increment: 1 } },
          });
        }
      }

      if (this.useHlsPresignMode()) {
        const signed = await this.uploads.presignGetByKey(latestReadyAsset.manifestPath, 60 * 30);
        const qualities = this.getMinioQualitiesFromRenditions(latestReadyAsset.renditions);
        return {
          playbackUrl: signed.getUrl,
          format: 'HLS',
          provider: 'MINIO',
          assetId: latestReadyAsset.id,
          hlsMode: 'presign' as const,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          qualities,
          drmProtected: false,
        };
      }

      const pt = this.signHlsPlaybackToken(userId, latestReadyAsset.id);
      const proxyBase = this.buildHlsProxyBaseForAsset(latestReadyAsset.id);
      const playbackUrl = `${proxyBase}?path=${encodeURIComponent('master.m3u8')}&pt=${encodeURIComponent(pt)}`;
      const qualities = this.getMinioQualitiesFromRenditions(latestReadyAsset.renditions);
      return {
        playbackUrl,
        format: 'HLS',
        provider: 'MINIO',
        assetId: latestReadyAsset.id,
        hlsMode: 'proxy' as const,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        qualities,
        drmProtected: false,
      };
    }

    if (!episode.muxPlaybackId) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }

    const signingKeyId = this.config.get('MUX_SIGNING_KEY_ID')!;
    const signingPrivateKey = this.config.get('MUX_SIGNING_PRIVATE_KEY')!;

    const token = await this.mux.jwt.signPlaybackId(episode.muxPlaybackId, {
      type: 'video',
      expiration: '24h',
      keyId: signingKeyId,
      keySecret: signingPrivateKey,
      params: { viewer_id: userId },
    });

    if (!canPreview) {
      const recentView = await this.prisma.watchHistory.findFirst({
        where: {
          userId,
          contentId: episode.contentId,
          episodeId: episode.id,
          lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!recentView) {
        await this.prisma.episode.update({
          where: { id: episodeId },
          data: { viewCount: { increment: 1 } },
        });
      }
    }

    return {
      playbackUrl: `https://stream.mux.com/${episode.muxPlaybackId}.m3u8?token=${token}`,
      format: 'HLS',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      qualities: ['240p', '480p', '720p', '1080p'],
      drmProtected: true,
    };
  }

  /**
   * Sert un segment ou une playlist HLS depuis MinIO, avec réécriture des chemins relatifs vers ce proxy.
   * Auth : paramètre `pt` (JWT) émis par les endpoints `/stream` pour un utilisateur ayant déjà passé les contrôles d’accès.
   */
  async streamHlsThroughProxy(
    videoAssetId: string,
    relativePath: string,
    ptRaw: string | undefined,
  ): Promise<StreamableFile> {
    const pt = ptRaw?.trim();
    if (!pt) {
      throw new UnauthorizedException({ code: 'HLS_002', message: 'Jeton de lecture manquant (pt).' });
    }
    const userId = this.verifyHlsPlaybackToken(pt, videoAssetId);
    const rel = this.sanitizeHlsRelativePath(relativePath);

    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: videoAssetId },
      include: {
        content: {
          include: {
            creator: { select: { userId: true } },
            status: { select: { code: true } },
            visibility: { select: { code: true } },
          },
        },
      },
    });

    if (!asset?.manifestPath || !['READY', 'PUBLISHED'].includes(asset.status)) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }
    const isContentOwner = asset.content.creator.userId === userId;
    if (!isContentOwner && asset.content.status.code !== CONTENT_STATUS.PUBLISHED) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu en cours de traitement' });
    }
    if (asset.content.visibility.code === CONTENT_VISIBILITY.PRIVATE && asset.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }
    const planCode = await this.getActivePlanCode(userId);
    if (asset.content.visibility.code === CONTENT_VISIBILITY.PREMIUM_ONLY && planCode === PLAN_CODE.FREE) {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement Premium est requis pour accéder à ce contenu',
      });
    }
    if (asset.content.visibility.code === CONTENT_VISIBILITY.PPV && planCode === PLAN_CODE.FREE) {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement est requis pour accéder à ce contenu PPV.',
      });
    }

    const rootPrefix = `video/hls/${videoAssetId}/`;
    const objectKey = posix.normalize(posix.join(rootPrefix, rel)).replace(/^\//, '');
    if (!objectKey.startsWith(rootPrefix)) {
      throw new ForbiddenException({ code: 'HLS_004', message: 'Accès média refusé' });
    }

    const { stream, contentType } = await this.uploads.getObjectStream(objectKey);
    const effectiveType =
      contentType && contentType !== 'application/octet-stream'
        ? contentType
        : this.guessStoredObjectContentType(objectKey);

    if (objectKey.endsWith('.m3u8')) {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Buffer));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      const proxyBase = this.buildHlsProxyBaseForAsset(videoAssetId);
      const rewritten = this.rewriteHlsPlaylistManifest(text, proxyBase, pt, rel);
      return new StreamableFile(Buffer.from(rewritten, 'utf8'), {
        type: `${effectiveType}; charset=utf-8`,
      });
    }

    return new StreamableFile(stream, { type: effectiveType });
  }
}
