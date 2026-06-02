import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { VideoPipelineService } from './video-pipeline.service';
import { resolveUserHasStaffRole } from '../../common/helpers/user-roles.helper';

const execFileAsync = promisify(execFile);

@Injectable()
export class VideoSubtitlesService {
  private readonly ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly pipeline: VideoPipelineService,
  ) {}

  private async assertContentEditor(userId: string, contentId: string, jwtRoles?: string[]) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: { select: { userId: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    const isStaff = await resolveUserHasStaffRole(this.prisma, userId, jwtRoles);
    const isOwner =
      content.uploadedByUserId === userId || content.creator?.userId === userId;
    if (!isStaff && !isOwner) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    return content;
  }

  async createUploadUrl(
    userId: string,
    contentId: string,
    languageCode: string,
    format: 'VTT' | 'SRT' = 'VTT',
    episodeId?: string,
    jwtRoles?: string[],
  ) {
    await this.assertContentEditor(userId, contentId, jwtRoles);

    const language = await this.prisma.refLanguage.findUnique({
      where: { code: languageCode },
      select: { id: true, code: true, label: true },
    });
    if (!language) {
      throw new BadRequestException({ code: 'LANG_001', message: 'Langue invalide' });
    }

    if (episodeId) {
      const ep = await this.prisma.episode.findFirst({
        where: { id: episodeId, contentId },
        select: { id: true },
      });
      if (!ep) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
    }

    const ext = format === 'SRT' ? 'srt' : 'vtt';
    const objectKey = episodeId
      ? `subtitles/${contentId}/episodes/${episodeId}/${language.code}-${randomUUID()}.${ext}`
      : `subtitles/${contentId}/${language.code}-${randomUUID()}.${ext}`;

    const uploadUrl = await this.minio.presignedPutUrl(
      this.minio.bucketVideos,
      objectKey,
      3600,
    );

    return {
      uploadUrl,
      objectKey,
      bucket: this.minio.bucketVideos,
      language: { code: language.code, label: language.label },
      format,
      episodeId: episodeId ?? null,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async registerTrack(
    userId: string,
    contentId: string,
    body: {
      objectKey: string;
      languageCode: string;
      format?: 'VTT' | 'SRT';
      episodeId?: string;
      isDefault?: boolean;
      isForced?: boolean;
    },
    jwtRoles?: string[],
  ) {
    await this.assertContentEditor(userId, contentId, jwtRoles);

    const exists = await this.minio.exists(this.minio.bucketVideos, body.objectKey);
    if (!exists) {
      throw new BadRequestException({ code: 'ASSET_002', message: 'Fichier sous-titre introuvable' });
    }

    const language = await this.prisma.refLanguage.findUnique({
      where: { code: body.languageCode },
    });
    if (!language) {
      throw new BadRequestException({ code: 'LANG_001', message: 'Langue invalide' });
    }

    // Normalisation : SRT → VTT (WebVTT) pour compatibilité players
    let normalizedObjectKey = body.objectKey;
    let normalizedFormat: 'VTT' | 'SRT' = body.format ?? 'VTT';
    if ((body.format ?? 'VTT') === 'SRT') {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ivod-subs-'));
      try {
        const src = path.join(tmpDir, 'sub.srt');
        const out = path.join(tmpDir, 'sub.vtt');
        await this.minio.downloadFile(this.minio.bucketVideos, body.objectKey, src);
        await execFileAsync(this.ffmpegPath, ['-y', '-i', src, out], { timeout: 30_000 });

        const vttKey = body.objectKey.replace(/\.srt$/i, '.vtt');
        await this.minio.uploadFile(this.minio.bucketVideos, vttKey, out);
        // garder le .srt pour audit si besoin ? on supprime pour réduire stockage
        await this.minio.remove(this.minio.bucketVideos, body.objectKey).catch(() => {});

        normalizedObjectKey = vttKey;
        normalizedFormat = 'VTT';
      } catch {
        // Si ffmpeg indisponible / conversion échoue, on garde le SRT tel quel.
        normalizedObjectKey = body.objectKey;
        normalizedFormat = 'SRT';
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (body.isDefault) {
      await this.prisma.subtitleTrack.updateMany({
        where: {
          contentId,
          episodeId: body.episodeId ?? null,
        },
        data: { isDefault: false },
      });
    }

    const track = await this.prisma.subtitleTrack.create({
      data: {
        contentId,
        episodeId: body.episodeId ?? null,
        languageId: language.id,
        objectKey: normalizedObjectKey,
        format: normalizedFormat,
        isDefault: body.isDefault ?? false,
        isForced: body.isForced ?? false,
      },
      include: { language: { select: { code: true, label: true } } },
    });

    await this.repackageIfReady(contentId, body.episodeId);

    return track;
  }

  async listTracks(contentId: string, episodeId?: string) {
    return this.prisma.subtitleTrack.findMany({
      where: { contentId, episodeId: episodeId ?? null },
      include: { language: { select: { code: true, label: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async deleteTrack(userId: string, trackId: string, jwtRoles?: string[]) {
    const track = await this.prisma.subtitleTrack.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException({ code: 'SUB_001', message: 'Piste introuvable' });

    await this.assertContentEditor(userId, track.contentId, jwtRoles);
    await this.prisma.subtitleTrack.delete({ where: { id: trackId } });
    await this.minio.remove(this.minio.bucketVideos, track.objectKey).catch(() => {});
    await this.repackageIfReady(track.contentId, track.episodeId ?? undefined);

    return { deleted: true };
  }

  private async repackageIfReady(contentId: string, episodeId?: string) {
    const asset = await this.prisma.videoAsset.findFirst({
      where: {
        contentId,
        episodeId: episodeId ?? null,
        status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (asset) {
      await this.pipeline.enqueuePackage(asset.id, 'full');
    }
  }
}
