import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { MediaJobsService } from '../media-jobs/media-jobs.service';
import { InitMediaAssetUploadDto, MarkMediaAssetUploadedDto } from './dto/media-assets.dto';
import { isEpisodicContentType } from '../../common/helpers/content-type.helper';

@Injectable()
export class MediaAssetsService {
  private serializeAssetBigInt<T extends { sourceSizeBytes?: bigint | null }>(asset: T): Omit<T, 'sourceSizeBytes'> & {
    sourceSizeBytes?: string | null;
  } {
    return {
      ...asset,
      sourceSizeBytes:
        typeof asset.sourceSizeBytes === 'bigint' ? asset.sourceSizeBytes.toString() : asset.sourceSizeBytes,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly mediaJobs: MediaJobsService,
  ) {}

  private async assertCanAccessContent(contentId: string, userId: string, role: string) {
    if (role === 'ADMIN') return;
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, creator: { select: { userId: true } } },
    });
    if (!content) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    if (content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
  }

  private async assertCanAccessAsset(assetId: string, userId: string, role: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { id: true, contentId: true },
    });
    if (!asset) {
      throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    }
    await this.assertCanAccessContent(asset.contentId, userId, role);
  }

  async presignImage(dto: { folder: string; filename: string; contentType: string }) {
    return this.uploads.presignPut({
      folder: `content/images/${dto.folder}`,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }

  async initUpload(userId: string, role: string, dto: InitMediaAssetUploadDto) {
    if (!dto.contentId && !dto.episodeId) {
      throw new NotFoundException({ code: 'MEDIA_ASSET_002', message: 'contentId ou episodeId requis' });
    }

    let contentId = dto.contentId ?? null;
    const episodeId = dto.episodeId ?? null;
    if (episodeId) {
      const episode = await this.prisma.episode.findUnique({
        where: { id: episodeId },
        select: {
          id: true,
          contentId: true,
          content: { select: { contentType: { select: { code: true, typeCode: true } } } },
        },
      });
      if (!episode) {
        throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
      }
      if (
        !isEpisodicContentType(
          episode.content.contentType.typeCode ?? episode.content.contentType.code,
        )
      ) {
        throw new BadRequestException({
          code: 'CONTENT_011',
          message: 'Les épisodes sont autorisés uniquement pour SERIES/WEB_SERIES.',
        });
      }
      contentId = episode.contentId;
    }
    if (!contentId) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    await this.assertCanAccessContent(contentId, userId, role);
    const presign = await this.uploads.presignPut({
      folder: episodeId ? `video/raw/episodes/${episodeId}` : `video/raw/${contentId}`,
      filename: dto.filename,
      contentType: dto.contentType,
    });

    const asset = await this.prisma.videoAsset.create({
      data: {
        contentId,
        episodeId,
        sourceObjectKey: presign.key,
        sourceChecksum: dto.checksum,
        sourceMimeType: dto.contentType,
        sourceSizeBytes: typeof dto.sizeBytes === 'number' ? BigInt(dto.sizeBytes) : null,
        status: 'CREATED',
      },
      select: {
        id: true,
        contentId: true,
        episodeId: true,
        status: true,
        sourceObjectKey: true,
        createdAt: true,
      },
    });

    // Transition DRAFT → UPLOADING sur le contenu ou l'épisode
    if (episodeId) {
      await this.prisma.episode.update({
        where: { id: episodeId },
        data: { status: { connect: { code: 'UPLOADING' } } },
      });
    } else if (contentId) {
      await this.prisma.content.update({
        where: { id: contentId },
        data: { status: { connect: { code: 'UPLOADING' } } },
      });
    }

    return {
      ...asset,
      upload: {
        bucket: presign.bucket,
        key: presign.key,
        putUrl: presign.putUrl,
        publicUrl: presign.publicUrl,
      },
    };
  }

  async markUploaded(assetId: string, userId: string, role: string, dto: MarkMediaAssetUploadedDto) {
    await this.assertCanAccessAsset(assetId, userId, role);
    const existing = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    }
    if (existing.status !== 'CREATED') {
      throw new BadRequestException({
        code: 'MEDIA_ASSET_003',
        message: `Impossible de marquer cet asset comme uploadé : statut actuel "${existing.status}" (attendu : CREATED).`,
      });
    }

    const updated = await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: {
        status: 'UPLOADED',
        sourceChecksum: dto.checksum ?? undefined,
        sourceSizeBytes: typeof dto.sizeBytes === 'number' ? BigInt(dto.sizeBytes) : undefined,
      },
      select: {
        id: true,
        contentId: true,
        episodeId: true,
        status: true,
        sourceObjectKey: true,
        updatedAt: true,
      },
    });

    const queue = await this.mediaJobs.enqueueProbe(assetId);

    return {
      ...updated,
      queue,
    };
  }

  async getOne(assetId: string, userId: string, role: string) {
    await this.assertCanAccessAsset(assetId, userId, role);
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        renditions: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!asset) {
      throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    }
    return this.serializeAssetBigInt(asset);
  }

  async getByEpisode(episodeId: string, userId: string, role: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, contentId: true },
    });
    if (!episode) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    }
    await this.assertCanAccessContent(episode.contentId, userId, role);
    const assets = await this.prisma.videoAsset.findMany({
      where: { episodeId },
      include: {
        renditions: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = await Promise.all(
      assets.map(async (asset) => {
        const probe = await this.mediaJobs.getBullmqProgress(asset.id, 'probe');
        const transcode = await this.mediaJobs.getBullmqProgress(asset.id, 'transcode');
        return {
          ...this.serializeAssetBigInt(asset),
          bullmq: {
            probe,
            transcode,
          },
        };
      }),
    );

    return enriched;
  }

  async getLatestStatusByEpisode(episodeId: string, userId: string, role: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, contentId: true },
    });
    if (!episode) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    }
    await this.assertCanAccessContent(episode.contentId, userId, role);

    const latest = await this.prisma.videoAsset.findFirst({
      where: { episodeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return latest;
  }

  async retryTranscode(assetId: string, userId: string, role: string) {
    await this.assertCanAccessAsset(assetId, userId, role);
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    }
    const runningOrQueued = await this.prisma.videoJob.findFirst({
      where: { assetId, type: 'transcode', status: { in: ['queued', 'running'] } },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    if (runningOrQueued) {
      return {
        assetId,
        skipped: true,
        reason: `transcode_${runningOrQueued.status}`,
        jobId: runningOrQueued.id,
      };
    }

    const queue = await this.mediaJobs.enqueueTranscode(assetId);
    return { assetId, queue, skipped: false };
  }
}

