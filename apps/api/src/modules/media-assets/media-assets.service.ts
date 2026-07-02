import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { mkdtemp, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { probeVideoDurationSec } from '../../common/helpers/video-probe';
import {
  isPromoVideoTypeCode,
  resolvePromoVideosBundle,
  type PromoVideoAssetRow,
} from '../../common/promo-media';
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES } from '../../common/constants/upload-mime-types';

@Injectable()
export class MediaAssetsService {
  private readonly logger = new Logger(MediaAssetsService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  private async resolveTypeId(code: string): Promise<string> {
    const ref = await this.prisma.refMediaAssetType.findUniqueOrThrow({
      where: { code },
      select: { id: true },
    });
    return ref.id;
  }

  private promoSelect() {
    return {
      id: true,
      objectKey: true,
      mimeType: true,
      languageCode: true,
      isPrimary: true,
      sortOrder: true,
      durationSec: true,
      label: true,
      promoVariant: true,
      type: { select: { code: true, label: true } },
    };
  }

  async listForContent(contentId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { contentId },
      include: { type: { select: { code: true, label: true } } },
      orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async listPromoForContent(contentId: string, locale?: string) {
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        contentId,
        episodeId: null,
        type: { code: { in: ['TEASER', 'TRAILER', 'CLIP', 'MAKING_OF'] } },
      },
      orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: this.promoSelect(),
    });
    return resolvePromoVideosBundle(assets as PromoVideoAssetRow[], { locale });
  }

  /**
   * URL signée pour lecture promo — public (pas d’entitlement feature).
   * Cherche l’objet dans ivod-videos puis ivod-assets (rétrocompat).
   */
  async getPromoStreamUrl(assetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: {
        ...this.promoSelect(),
        content: { select: { id: true, title: true, status: { select: { code: true } } } },
      },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Ressource introuvable' });
    const typeCode = asset.type?.code;
    if (!typeCode || !isPromoVideoTypeCode(typeCode)) {
      throw new BadRequestException({
        code: 'PROMO_001',
        message: 'Cet asset n’est pas une vidéo promotionnelle',
      });
    }

    const statusCode = asset.content?.status?.code;
    if (statusCode && !['PUBLISHED', 'PENDING_REVIEW', 'DRAFT'].includes(statusCode)) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu indisponible' });
    }

    let bucket = this.minio.bucketVideos;
    let exists = await this.minio.exists(bucket, asset.objectKey);
    if (!exists) {
      bucket = this.minio.bucketAssets;
      exists = await this.minio.exists(bucket, asset.objectKey);
    }
    if (!exists) {
      throw new NotFoundException({ code: 'PROMO_002', message: 'Fichier vidéo introuvable' });
    }

    const url = await this.minio.presignedGetUrl(bucket, asset.objectKey);
    const bundle = resolvePromoVideosBundle([asset as PromoVideoAssetRow]);
    const match =
      bundle.all.find((p) => p.id === assetId) ??
      bundle.primaryTrailer ??
      bundle.primaryTeaser;

    return {
      url,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      mimeType: asset.mimeType,
      displayLabel: match?.displayLabel ?? asset.type?.label ?? 'Vidéo',
      typeCode,
      contentId: asset.content.id,
      contentTitle: asset.content.title,
    };
  }

  async create(
    contentId: string,
    userId: string,
    dto: {
      type: string;
      objectKey: string;
      mimeType?: string;
      width?: number;
      height?: number;
      isPrimary?: boolean;
      episodeId?: string;
      promoVariant?: string;
      durationSec?: number;
      label?: string;
      sortOrder?: number;
    },
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    if (dto.mimeType) this.assertAllowedMimeType(dto.type, dto.mimeType);
    const bucket = this.resolveUploadBucket(dto.type, dto.mimeType ?? '');
    await this.assertObjectBelongsToContent(contentId, dto.type, dto.objectKey, bucket);
    const typeId = await this.resolveTypeId(dto.type);
    if (dto.isPrimary) {
      await this.prisma.mediaAsset.updateMany({
        where: { contentId, typeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const { type: _type, ...rest } = dto;
    const asset = await this.prisma.mediaAsset.create({
      data: { contentId, ...rest, typeId },
      include: { type: { select: { code: true, label: true } } },
    });

    if (
      isPromoVideoTypeCode(dto.type) &&
      dto.mimeType?.startsWith('video/') &&
      !dto.durationSec
    ) {
      try {
        const durationSec = await this.probePromoDurationFromStorage(dto.objectKey);
        if (durationSec) {
          return this.prisma.mediaAsset.update({
            where: { id: asset.id },
            data: { durationSec },
            include: { type: { select: { code: true, label: true } } },
          });
        }
      } catch (err) {
        this.logger.warn(`Promo probe failed for ${asset.id}: ${String(err)}`);
      }
    }

    return asset;
  }

  private async resolvePromoObjectBucket(objectKey: string): Promise<string> {
    let bucket = this.minio.bucketVideos;
    if (await this.minio.exists(bucket, objectKey)) return bucket;
    bucket = this.minio.bucketAssets;
    if (await this.minio.exists(bucket, objectKey)) return bucket;
    return this.minio.bucketVideos;
  }

  private async probePromoDurationFromStorage(objectKey: string): Promise<number | null> {
    const bucket = await this.resolvePromoObjectBucket(objectKey);
    const ext = objectKey.split('.').pop() ?? 'mp4';
    const tmpDir = await mkdtemp(join(tmpdir(), 'ivod-promo-probe-'));
    const tmpFile = join(tmpDir, `source.${ext}`);
    try {
      await this.minio.downloadFile(bucket, objectKey, tmpFile);
      return await probeVideoDurationSec(tmpFile);
    } finally {
      await unlink(tmpFile).catch(() => undefined);
    }
  }

  async remove(assetId: string, userId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: { content: { include: { creator: true } } },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Ressource introuvable' });
    if (asset.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { message: 'Ressource supprimée' };
  }

  async setPrimary(assetId: string, userId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: { content: { include: { creator: true } } },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Ressource introuvable' });
    if (asset.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    await this.prisma.mediaAsset.updateMany({
      where: { contentId: asset.contentId, typeId: asset.typeId, isPrimary: true },
      data: { isPrimary: false },
    });
    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { isPrimary: true },
      include: { type: { select: { code: true, label: true } } },
    });
  }

  /** Bucket MinIO selon type promo / image. */
  resolveUploadBucket(assetType: string, mimeType: string): string {
    const isVideo = mimeType.startsWith('video/');
    if (isVideo && isPromoVideoTypeCode(assetType)) {
      return this.minio.bucketVideos;
    }
    return this.minio.bucketAssets;
  }

  /**
   * Avant ce correctif, `mimeType` n'était validé par aucune allowlist — un
   * CREATOR pouvait demander une presigned PUT pour n'importe quel type
   * (text/html, image/svg+xml...). Rejette tout type non attendu pour ce
   * assetType. Allowlists partagées avec banners.service.ts et
   * videos.service.ts — voir common/constants/upload-mime-types.ts.
   */
  assertAllowedMimeType(assetType: string, mimeType: string): void {
    const allowed = isPromoVideoTypeCode(assetType)
      ? ALLOWED_VIDEO_MIME_TYPES
      : ALLOWED_IMAGE_MIME_TYPES;
    if (!allowed.has(mimeType)) {
      throw new BadRequestException({
        code: 'ASSET_002',
        message: `Type de fichier non autorisé pour ${assetType} : ${mimeType}`,
      });
    }
  }

  /**
   * Avant ce correctif, `create()` persistait n'importe quel `objectKey`
   * fourni par le client sans vérifier qu'il avait bien été uploadé pour CE
   * contenu — un CREATOR pouvait enregistrer un asset pointant vers la clé
   * de quelqu'un d'autre dans le même bucket partagé. On vérifie que la clé
   * respecte le préfixe `<assets|promo>/<type>/<contentId>/` émis par
   * presignUpload() ET qu'un objet existe réellement à cette clé.
   */
  private async assertObjectBelongsToContent(
    contentId: string,
    assetType: string,
    objectKey: string,
    bucket: string,
  ): Promise<void> {
    const typeSlug = assetType.toLowerCase();
    const expectedPrefixes = [
      `assets/${typeSlug}/${contentId}/`,
      `promo/${typeSlug}/${contentId}/`,
    ];
    if (!expectedPrefixes.some((prefix) => objectKey.startsWith(prefix))) {
      throw new ForbiddenException({
        code: 'ASSET_003',
        message: 'objectKey ne correspond pas à ce contenu',
      });
    }
    const exists = await this.minio.exists(bucket, objectKey);
    if (!exists) {
      throw new BadRequestException({
        code: 'ASSET_004',
        message: "L'objet indiqué n'a pas été uploadé",
      });
    }
  }
}
