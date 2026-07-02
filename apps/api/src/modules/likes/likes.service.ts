import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveProfileId } from '../../common/helpers/profile.helper';

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  async toggle(
    userId: string,
    contentId: string,
    profileId?: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const resolvedProfileId = await resolveProfileId(this.prisma, userId, profileId);
    const content = await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const existing = await this.prisma.contentLike.findUnique({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.contentLike.delete({
          where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
        }),
        this.prisma.content.update({ where: { id: contentId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      const updated = await this.prisma.content.findUnique({
        where: { id: contentId },
        select: { likeCount: true },
      });
      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    }

    await this.prisma.$transaction([
      this.prisma.contentLike.create({ data: { profileId: resolvedProfileId, contentId } }),
      this.prisma.content.update({ where: { id: contentId }, data: { likeCount: { increment: 1 } } }),
    ]);
    const updated = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { likeCount: true },
    });
    return { liked: true, likeCount: updated?.likeCount ?? 0 };
  }

  async status(userId: string, contentId: string, profileId?: string) {
    const resolvedProfileId = await resolveProfileId(this.prisma, userId, profileId);
    const like = await this.prisma.contentLike.findUnique({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { likeCount: true },
    });
    return { liked: !!like, likeCount: content?.likeCount ?? 0 };
  }
}
