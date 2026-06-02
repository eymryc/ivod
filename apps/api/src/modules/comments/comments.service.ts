import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  private async defaultProfileId(userId: string) {
    const p = await this.prisma.profile.findFirst({ where: { userId, isDefault: true }, select: { id: true } });
    if (!p) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    return p.id;
  }

  async list(contentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { contentId, parentId: null, isDeleted: false },
        include: {
          profile: { select: { name: true, avatarUrl: true } },
          replies: {
            where: { isDeleted: false },
            include: { profile: { select: { name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
            take: 5,
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.comment.count({ where: { contentId, parentId: null, isDeleted: false } }),
    ]);
    return { items, total, page, limit };
  }

  async create(userId: string, contentId: string, body: string, parentId?: string) {
    const profileId = await this.defaultProfileId(userId);
    if (!await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    if (parentId && !await this.prisma.comment.findUnique({ where: { id: parentId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'COMMENT_001', message: 'Commentaire parent introuvable' });
    }
    const comment = await this.prisma.comment.create({ data: { profileId, contentId, body, parentId } });
    await this.prisma.contentStats.upsert({
      where: { contentId },
      create: { contentId, commentCount: 1 },
      update: { commentCount: { increment: 1 } },
    });
    return comment;
  }

  async update(userId: string, commentId: string, body: string) {
    const profileId = await this.defaultProfileId(userId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new NotFoundException({ code: 'COMMENT_001', message: 'Commentaire introuvable' });
    if (comment.profileId !== profileId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.comment.update({ where: { id: commentId }, data: { body } });
  }

  async delete(userId: string, commentId: string) {
    const profileId = await this.defaultProfileId(userId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException({ code: 'COMMENT_001', message: 'Commentaire introuvable' });
    if (comment.profileId !== profileId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    await this.prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true, body: '[supprimé]' } });
    return { message: 'Commentaire supprimé' };
  }

  async moderate(adminUserId: string, commentId: string, action: 'approve' | 'hide') {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException({ code: 'COMMENT_001', message: 'Commentaire introuvable' });
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { isModerated: action === 'hide', moderatedAt: new Date(), moderatedByUserId: adminUserId },
    });
  }
}
