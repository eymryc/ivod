import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/types';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async follow(followerId: string, creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, userId: true },
    });
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

    if (creator.userId && creator.userId !== followerId) {
      this.notifications.dispatch({
        userId: creator.userId,
        type: NotificationType.NEW_FOLLOWER,
        title: 'Nouvel abonné',
        body: 'Quelqu\'un vient de s\'abonner à votre chaîne.',
        data: { creatorId, followerId },
      }).catch((err: Error) => this.logger.error('Erreur notification NEW_FOLLOWER', err.message));
    }

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
              id: true, stageName: true, avatarObjectKey: true,
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
