import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { MinioService } from '../../common/services/minio.service';

const MIME_BY_EXT: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

function guessMime(objectKey: string): string {
  const ext = objectKey.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

function sanitizeObjectKey(key: string): string {
  const trimmed = key.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.includes('..')) {
    throw new BadRequestException({ code: 'STORAGE_001', message: 'Clé objet invalide' });
  }
  return trimmed;
}

/** Vignettes / HLS pipeline — bucket vidéo, pas catalogue. */
const VIDEOS_BUCKET_KEY_PREFIXES = [
  'thumbnails/',
  'hls/',
  'storyboards/',
  'videos/',
  'subtitles/',
] as const;

function isVideosBucketObjectKey(objectKey: string): boolean {
  return VIDEOS_BUCKET_KEY_PREFIXES.some((prefix) => objectKey.startsWith(prefix));
}

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly minio: MinioService) {}

  /** Lecture publique des affiches / vignettes (buckets privés MinIO) */
  @Public()
  @Get('object')
  @ApiOperation({ summary: 'Servir un fichier MinIO (affiches, vignettes, avatars)' })
  @ApiQuery({ name: 'bucket', example: 'ivod-assets' })
  @ApiQuery({ name: 'key', example: 'assets/poster/xxx/cover.webp' })
  async getObject(
    @Query('bucket') bucket: string,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const allowed = new Set([this.minio.bucketAssets, this.minio.bucketVideos]);
    if (!bucket || !allowed.has(bucket)) {
      throw new BadRequestException({ code: 'STORAGE_002', message: 'Bucket non autorisé' });
    }

    const objectKey = sanitizeObjectKey(key);
    let resolvedBucket = bucket;
    let exists = await this.minio.exists(resolvedBucket, objectKey);
    if (
      !exists &&
      resolvedBucket === this.minio.bucketAssets &&
      isVideosBucketObjectKey(objectKey)
    ) {
      const fallback = this.minio.bucketVideos;
      if (await this.minio.exists(fallback, objectKey)) {
        resolvedBucket = fallback;
        exists = true;
      }
    }
    if (!exists) {
      throw new NotFoundException({ code: 'STORAGE_003', message: 'Fichier introuvable' });
    }

    const stat = await this.minio.statObject(resolvedBucket, objectKey);
    const contentType =
      (stat.metaData?.['content-type'] as string | undefined) ??
      (stat.metaData?.['Content-Type'] as string | undefined) ??
      guessMime(objectKey);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    // Web (:3001) et API (:3000) = origines différentes — autoriser l’embed <img>
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (stat.etag) res.setHeader('ETag', stat.etag);
    if (stat.size) res.setHeader('Content-Length', String(stat.size));

    const stream = await this.minio.getObjectStream(resolvedBucket, objectKey);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    stream.pipe(res);
  }
}
