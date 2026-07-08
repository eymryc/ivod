import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  // Client séparé pour générer les presigned URLs avec l'endpoint public (accessible depuis le navigateur).
  // En dev Docker : client interne utilise "minio:9000", urlClient utilise "localhost:9000".
  // La signature HMAC est liée au host — les deux doivent utiliser le bon endpoint.
  // region fixée à 'us-east-1' pour court-circuiter l'appel HTTP getBucketRegion (incompatible
  // avec l'endpoint public depuis l'intérieur du container Docker).
  private urlClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);

  readonly bucketVideos: string;
  readonly bucketAssets: string;

  constructor(private config: ConfigService) {
    this.bucketVideos = this.config.get('MINIO_BUCKET_VIDEOS', 'ivod-videos');
    this.bucketAssets = this.config.get('MINIO_BUCKET_ASSETS', 'ivod-assets');

    const useSSL    = this.config.get('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.config.get('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.config.get('MINIO_SECRET_KEY', 'minioadmin');
    // Région explicite — obligatoire pour Wasabi/Backblaze (évite l'appel HTTP getBucketRegion)
    const region    = this.config.get('MINIO_REGION', 'us-east-1');

    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get('MINIO_PORT', '9000'), 10),
      useSSL,
      accessKey,
      secretKey,
      region,
    });

    const internalEndPoint = this.config.get('MINIO_ENDPOINT', 'localhost');
    const internalPort     = this.config.get('MINIO_PORT', '9000');
    const publicEndPoint   = this.config.get('MINIO_PUBLIC_ENDPOINT') ?? internalEndPoint;
    const publicPort       = parseInt(this.config.get('MINIO_PUBLIC_PORT') ?? internalPort, 10);
    // Distinct de MINIO_USE_SSL : le trafic INTERNE (ce container → minio:9000
    // dans le réseau Docker) reste en clair même en prod (MinIO n'a pas de
    // cert TLS), mais les presigned URLs données au navigateur DOIVENT être
    // en https (sinon "mixed content" bloqué par le navigateur sur une page
    // servie en https). Nginx reverse-proxy le chemin public vers minio:9000
    // en clair — voir apps/api/nginx/nginx.prod.conf (locations /ivod-videos/,
    // /ivod-assets/) et docs/DEPLOY.md.
    const publicUseSSL = this.config.get('MINIO_PUBLIC_USE_SSL', String(useSSL)) === 'true';

    this.urlClient = new Minio.Client({
      endPoint: publicEndPoint,
      port:     publicPort,
      useSSL:   publicUseSSL,
      accessKey,
      secretKey,
      region,
    });
  }

  async onModuleInit() {
    // MINIO_SKIP_BUCKET_INIT=true pour S3 externe (Wasabi, Backblaze) — buckets créés dans leur console
    if (this.config.get('MINIO_SKIP_BUCKET_INIT') === 'true') return;
    await this.ensureBucket(this.bucketVideos);
    await this.ensureBucket(this.bucketAssets);
  }

  private async ensureBucket(name: string) {
    const region = this.config.get('MINIO_REGION', 'us-east-1');
    try {
      const exists = await this.client.bucketExists(name);
      if (!exists) {
        await this.client.makeBucket(name, region);
        this.logger.log(`Bucket créé : ${name}`);
      }
    } catch (err) {
      this.logger.error(`Erreur bucket ${name}`, err);
    }
  }

  /** Presigned PUT URL — upload direct depuis le navigateur (utilise l'endpoint public) */
  async presignedPutUrl(bucket: string, objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.urlClient.presignedPutObject(bucket, objectKey, expirySeconds);
  }

  /** Presigned GET URL — lecture signée depuis le navigateur (utilise l'endpoint public) */
  async presignedGetUrl(bucket: string, objectKey: string, expirySeconds = 86400): Promise<string> {
    return this.urlClient.presignedGetObject(bucket, objectKey, expirySeconds);
  }

  /** URL publique (pour assets non-sensibles si bucket public) */
  publicUrl(bucket: string, objectKey: string): string {
    const defaultUseSSL = this.config.get('MINIO_USE_SSL', 'false') === 'true';
    const useSSL = this.config.get('MINIO_PUBLIC_USE_SSL', String(defaultUseSSL)) === 'true';
    const proto  = useSSL ? 'https' : 'http';
    const host   = this.config.get('MINIO_PUBLIC_ENDPOINT') ?? this.config.get('MINIO_ENDPOINT', 'localhost');
    const port   = parseInt(this.config.get('MINIO_PUBLIC_PORT') ?? this.config.get('MINIO_PORT', '9000'), 10);
    const standardPort = useSSL ? 443 : 80;
    const portStr = port === standardPort ? '' : `:${port}`;
    return `${proto}://${host}${portStr}/${bucket}/${objectKey}`;
  }

  /** Supprimer un objet */
  async remove(bucket: string, objectKey: string) {
    await this.client.removeObject(bucket, objectKey);
  }

  /** Métadonnées objet */
  async statObject(bucket: string, objectKey: string) {
    return this.client.statObject(bucket, objectKey);
  }

  /** Flux lecture (proxy navigateur) */
  async getObjectStream(bucket: string, objectKey: string) {
    return this.client.getObject(bucket, objectKey);
  }

  /** Lecture partielle (Range HTTP pour segments HLS). */
  async getPartialObjectStream(
    bucket: string,
    objectKey: string,
    offset: number,
    length: number,
  ) {
    return this.client.getPartialObject(bucket, objectKey, offset, length);
  }

  /** Vérifier l'existence d'un objet */
  async exists(bucket: string, objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /** Télécharger un objet vers un fichier local */
  async downloadFile(bucket: string, objectKey: string, destPath: string): Promise<void> {
    await this.client.fGetObject(bucket, objectKey, destPath);
  }

  /** Uploader un fichier local vers MinIO */
  async uploadFile(bucket: string, objectKey: string, srcPath: string): Promise<void> {
    await this.client.fPutObject(bucket, objectKey, srcPath);
  }

  /** Uploader un Buffer en mémoire vers MinIO */
  async uploadBuffer(bucket: string, objectKey: string, data: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    await this.client.putObject(bucket, objectKey, data, data.length, { 'Content-Type': contentType });
  }

  /** Upload multipart — init (appel réseau serveur→MinIO direct, pas une simple signature : doit
   * utiliser le client interne `minio:9000`, pas `urlClient` qui pointe sur l'endpoint public
   * `localhost:9000` — injoignable depuis l'intérieur du container, d'où l'ECONNREFUSED observé). */
  async initiateMultipartUpload(bucket: string, objectKey: string): Promise<string> {
    return this.client.initiateNewMultipartUpload(bucket, objectKey, {});
  }

  /** URL signée pour une partie multipart */
  async presignedMultipartPartUrl(
    bucket: string,
    objectKey: string,
    uploadId: string,
    partNumber: number,
    expirySeconds = 3600,
  ): Promise<string> {
    return this.urlClient.presignedUrl('PUT', bucket, objectKey, expirySeconds, {
      uploadId,
      partNumber: String(partNumber),
    });
  }

  /** Finaliser un upload multipart */
  async completeMultipartUpload(
    bucket: string,
    objectKey: string,
    uploadId: string,
    parts: Array<{ part: number; etag?: string }>,
  ): Promise<void> {
    await this.client.completeMultipartUpload(bucket, objectKey, uploadId, parts);
  }

  /** Lire un objet entier en mémoire (manifestes HLS, segments courts) */
  async getObjectBuffer(bucket: string, objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
