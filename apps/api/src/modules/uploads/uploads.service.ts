import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

export type PresignUploadInput = {
  folder: string;
  filename: string;
  contentType: string;
};

export type PresignUploadResult = {
  key: string;
  bucket: string;
  putUrl: string;
  publicUrl: string;
};

export type PresignGetResult = {
  bucket: string;
  key: string;
  getUrl: string;
};

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  private getBucket() {
    return this.config.get<string>('MINIO_BUCKET') ?? this.config.get<string>('S3_BUCKET') ?? 'ivod';
  }

  private getPublicBaseUrl() {
    const explicit = (this.config.get<string>('MINIO_PUBLIC_BASE_URL') ?? this.config.get<string>('S3_PUBLIC_BASE_URL') ?? '').trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    // Prefer MINIO_PRESIGN_ENDPOINT (browser-reachable) over MINIO_ENDPOINT (internal Docker hostname)
    const presignEndpoint = (this.config.get<string>('MINIO_PRESIGN_ENDPOINT') ?? '').trim().replace(/\/+$/, '');
    if (presignEndpoint) return `${presignEndpoint}/${this.getBucket()}`;
    const endpoint = (this.config.get<string>('MINIO_ENDPOINT') ?? '').trim().replace(/\/+$/, '');
    if (endpoint) return `${endpoint}/${this.getBucket()}`;
    return '';
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

  private s3ForPresign() {
    const endpoint = (
      this.config.get<string>('MINIO_PRESIGN_ENDPOINT') ??
      this.config.get<string>('MINIO_ENDPOINT') ??
      ''
    )
      .trim();
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

  async presignPut({ folder, filename, contentType }: PresignUploadInput): Promise<PresignUploadResult> {
    const safeFolder = String(folder || 'uploads').replace(/^\/+|\/+$/g, '');
    const safeName = String(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${safeFolder}/${Date.now()}-${randomUUID()}-${safeName}`;
    const bucket = this.getBucket();

    const putUrl = await getSignedUrl(
      this.s3ForPresign(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 60 * 5 },
    );

    const publicBase = this.getPublicBaseUrl();
    const publicUrl = publicBase ? `${publicBase}/${key}` : key;

    return { key, bucket, putUrl, publicUrl };
  }

  async presignGetByKey(key: string, expiresInSeconds = 60 * 15): Promise<PresignGetResult> {
    const bucket = this.getBucket();
    const getUrl = await getSignedUrl(
      this.s3ForPresign(),
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
    return { bucket, key, getUrl };
  }

  /** Flux objet S3/MinIO (proxy HLS, etc.). */
  async getObjectStream(key: string): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
    const bucket = this.getBucket();
    const out = await this.s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!out.Body) {
      throw new NotFoundException({ code: 'STORAGE_001', message: 'Objet stockage introuvable' });
    }
    return {
      stream: out.Body as Readable,
      contentType: out.ContentType ?? 'application/octet-stream',
      contentLength: out.ContentLength,
    };
  }

  /**
   * Supprime tous les objets sous un préfixe (ex. `video/hls/{assetId}/`).
   * @returns nombre d’objets supprimés.
   */
  async deleteObjectsByPrefix(prefix: string): Promise<number> {
    const normalized = String(prefix || '').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..')) return 0;

    const bucket = this.getBucket();
    const client = this.s3();
    let deleted = 0;
    let token: string | undefined;

    do {
      const list = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: normalized,
          ContinuationToken: token,
        }),
      );
      const keys = (list.Contents ?? []).map((c) => c.Key).filter((k): k is string => !!k);
      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
        deleted += keys.length;
      }
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);

    return deleted;
  }

  /**
   * Nettoie les sorties pipeline MinIO pour un asset (HLS + poster) avant un retry.
   */
  async deletePipelineOutputs(assetId: string): Promise<{ hlsDeleted: number; posterKey: string }> {
    const safeId = String(assetId || '').trim();
    if (!safeId) return { hlsDeleted: 0, posterKey: '' };

    const hlsPrefix = `video/hls/${safeId}/`;
    const posterKey = `video/posters/${safeId}.jpg`;
    const hlsDeleted = await this.deleteObjectsByPrefix(hlsPrefix);

    const bucket = this.getBucket();
    await this.s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: posterKey }));

    return { hlsDeleted, posterKey };
  }
}

