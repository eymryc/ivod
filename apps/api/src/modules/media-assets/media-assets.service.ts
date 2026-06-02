import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import {
  isPromoVideoTypeCode,
  resolvePromoVideosBundle,
  type PromoVideoAssetRow,
} from '../../common/promo-media';

@Injectable()
export class MediaAssetsService {
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
    const typeId = await this.resolveTypeId(dto.type);
    if (dto.isPrimary) {
      await this.prisma.mediaAsset.updateMany({
        where: { contentId, typeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const { type: _type, ...rest } = dto;
    return this.prisma.mediaAsset.create({
      data: { contentId, ...rest, typeId },
      include: { type: { select: { code: true, label: true } } },
    });
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
}
