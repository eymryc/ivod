import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveUserHasStaffRole } from '../../common/helpers/user-roles.helper';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

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
    const episodeWhere = showAll ? {} : { status: { code: 'PUBLISHED' as const } };

    const rows = await this.prisma.season.findMany({
      where: { contentId },
      include: {
        _count: { select: { episodes: true } },
        episodes: {
          where: episodeWhere,
          orderBy: { episodeNumber: 'asc' },
          select: {
            id: true,
            seasonNumber: true,
            episodeNumber: true,
            title: true,
            description: true,
            duration: true,
            thumbnailObjectKey: true,
            status: { select: { code: true, label: true } },
            videoAssets: {
              where: { status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { posterObjectKey: true },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
    return rows.map((s) => ({
      ...s,
      seasonNumber: s.number,
      episodes: s.episodes.map((ep) => ({
        ...ep,
        thumbnailObjectKey:
          ep.thumbnailObjectKey ?? ep.videoAssets?.[0]?.posterObjectKey ?? null,
        videoAssets: undefined,
      })),
    }));
  }

  /** Crée la saison 1 par défaut si le contenu série n'a encore aucune saison. */
  async ensureDefaultSeason(contentId: string, userId: string) {
    const existing = await this.prisma.season.count({ where: { contentId } });
    if (existing > 0) {
      return this.findByContent(contentId);
    }
    await this.create(contentId, userId, { number: 1, title: 'Saison 1' });
    return this.findByContent(contentId);
  }

  async findOne(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        episodes: {
          include: { status: { select: { code: true } } },
          orderBy: { episodeNumber: 'asc' },
        },
      },
    });
    if (!season) throw new NotFoundException({ code: 'SEASON_001', message: 'Saison introuvable' });
    return season;
  }

  async create(contentId: string, userId: string, dto: { number: number; title?: string; description?: string; releaseYear?: number }) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId }, include: { creator: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.season.create({ data: { contentId, ...dto } });
  }

  async update(seasonId: string, userId: string, dto: Partial<{ title: string; description: string; releaseYear: number; posterObjectKey: string }>) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId }, include: { content: { include: { creator: true } } } });
    if (!season) throw new NotFoundException({ code: 'SEASON_001', message: 'Saison introuvable' });
    if (season.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.season.update({ where: { id: seasonId }, data: dto });
  }

  async remove(seasonId: string, userId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId }, include: { content: { include: { creator: true } } } });
    if (!season) throw new NotFoundException({ code: 'SEASON_001', message: 'Saison introuvable' });
    if (season.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    await this.prisma.season.delete({ where: { id: seasonId } });
    return { message: 'Saison supprimée' };
  }
}
