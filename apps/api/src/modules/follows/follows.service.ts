import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService) {}

  async follow(followerId: string, creatorId: string) {
    const creator = await this.prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId, creatorId } },
    });
    if (existing) throw new ConflictException({ code: 'FOLLOW_001', message: 'Déjà abonné à ce créateur' });

    await this.prisma.$transaction([
      this.prisma.follow.create({ data: { followerId, creatorId } }),
      this.prisma.creator.update({
        where: { id: creatorId },
        data: { subscriberCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Abonné au créateur' };
  }

  async unfollow(followerId: string, creatorId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId, creatorId } },
    });
    if (!existing) throw new NotFoundException({ code: 'FOLLOW_002', message: 'Pas abonné à ce créateur' });

    await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: { followerId_creatorId: { followerId, creatorId } },
      }),
      this.prisma.creator.update({
        where: { id: creatorId },
        data: { subscriberCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Désabonné du créateur' };
  }

  async listMyFollows(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          creator: {
            select: {
              id: true, stageName: true, avatarUrl: true,
              verified: true, subscriberCount: true,
              _count: { select: { contents: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { items: items.map(f => f.creator), total, page, limit };
  }

  async isFollowing(userId: string, creatorId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId: userId, creatorId } },
    });
    return !!follow;
  }
}
