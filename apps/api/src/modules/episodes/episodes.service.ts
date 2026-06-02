import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { resolveUserHasStaffRole } from '../../common/helpers/user-roles.helper';
import { PLAYABLE_VIDEO_STATUSES } from '../../common/constants/video-playback';

@Injectable()
export class EpisodesService {
  constructor(
    private prisma: PrismaService,
    private readonly contentDuration: ContentDurationService,
  ) {}

  private async canViewUnpublishedEpisodes(
    contentId: string,
    viewer?: { userId?: string; jwtRoles?: string[] },
  ): Promise<boolean> {
    if (!viewer?.userId) return false;
    if (await resolveUserHasStaffRole(this.prisma, viewer.userId, viewer.jwtRoles)) return true;
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        uploadedByUserId: true,
        creator: { select: { userId: true } },
      },
    });
    if (!content) return false;
    return (
      content.creator.userId === viewer.userId || content.uploadedByUserId === viewer.userId
    );
  }

  async findByContent(
    contentId: string,
    viewer?: { userId?: string; jwtRoles?: string[] },
  ) {
    const showAll = await this.canViewUnpublishedEpisodes(contentId, viewer);
    const episodes = await this.prisma.episode.findMany({
      where: {
        contentId,
        ...(showAll ? {} : { status: { code: 'PUBLISHED' } }),
      },
      include: {
        status: { select: { code: true } },
        videoAssets: {
          where: { status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
          take: 1,
          select: { manifestPath: true, muxPlaybackId: true, durationSec: true, status: true },
        },
      },
      orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
    });
    const seasonsMap = new Map<number, any[]>();
    for (const ep of episodes) {
      if (!seasonsMap.has(ep.seasonNumber)) seasonsMap.set(ep.seasonNumber, []);
      seasonsMap.get(ep.seasonNumber)!.push({ ...ep, status: (ep as any).status?.code });
    }
    return Array.from(seasonsMap.entries()).map(([season, eps]) => ({ season, episodeCount: eps.length, episodes: eps }));
  }

  async findOne(episodeId: string) {
    const ep = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: { select: { id: true, title: true, slug: true } },
        videoAssets: {
          where: { status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
          take: 1,
          select: { manifestPath: true, muxPlaybackId: true, durationSec: true, status: true },
        },
      },
    });
    if (!ep) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
    return ep;
  }

  async createForSeason(
    seasonId: string,
    userId: string,
    dto: { title: string; description?: string; episodeNumber: number; duration?: number; thumbnailObjectKey?: string },
  ) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { content: { include: { creator: true } } },
    });
    if (!season) throw new NotFoundException({ code: 'SEASON_001', message: 'Saison introuvable' });
    if (season.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    const statusId = (await this.prisma.refContentStatus.findUnique({ where: { code: 'DRAFT' } }))!.id;
    const episode = await this.prisma.episode.create({
      data: {
        contentId: season.contentId,
        seasonId: season.id,
        seasonNumber: season.number,
        episodeNumber: dto.episodeNumber,
        title: dto.title,
        description: dto.description,
        duration: dto.duration ?? 0,
        thumbnailObjectKey: dto.thumbnailObjectKey ?? null,
        statusId,
      },
    });
    await this.contentDuration.recalculateSeriesDuration(season.contentId);
    return episode;
  }

  async create(contentId: string, userId: string, dto: { title: string; description?: string; seasonNumber: number; episodeNumber: number; duration?: number; thumbnailObjectKey?: string }) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId }, include: { creator: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    const statusId = (await this.prisma.refContentStatus.findUnique({ where: { code: 'DRAFT' } }))!.id;
    return this.prisma.episode.create({
      data: { contentId, statusId, ...dto, duration: dto.duration ?? 0 },
    });
  }

  async update(
    episodeId: string,
    userId: string,
    dto: Partial<{ title: string; description: string; episodeNumber: number; duration: number; thumbnailObjectKey: string }>,
  ) {
    const ep = await this.prisma.episode.findUnique({ where: { id: episodeId }, include: { content: { include: { creator: true } } } });
    if (!ep) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
    if (ep.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.episode.update({ where: { id: episodeId }, data: dto });
  }

  async remove(episodeId: string, userId: string) {
    const ep = await this.prisma.episode.findUnique({ where: { id: episodeId }, include: { content: { include: { creator: true } } } });
    if (!ep) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
    if (ep.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    const contentId = ep.contentId;
    await this.prisma.episode.delete({ where: { id: episodeId } });
    await this.contentDuration.recalculateSeriesDuration(contentId);
    return { message: 'Épisode supprimé' };
  }
}
