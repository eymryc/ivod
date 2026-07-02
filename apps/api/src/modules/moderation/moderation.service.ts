import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  private async resolveModerationStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refModerationStatus.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  private async resolveModerationPriorityId(code: string): Promise<string> {
    const ref = await this.prisma.refModerationPriority.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  private async resolveReportStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refReportStatus.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  async listQueue(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status: { code: status } } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.moderationQueue.findMany({
        where,
        include: {
          content: { include: { creator: { select: { stageName: true } }, contentType: { select: { code: true } }, status: { select: { code: true } } } },
          priority: { select: { code: true, label: true } },
          status: { select: { code: true, label: true } },
        },
        orderBy: [{ createdAt: 'asc' }],
        skip, take: limit,
      }),
      this.prisma.moderationQueue.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async assign(queueId: string, moderatorUserId: string) {
    const item = await this.prisma.moderationQueue.findUnique({ where: { id: queueId } });
    if (!item) throw new NotFoundException({ code: 'MODERATION_001', message: 'Item introuvable' });
    const statusId = await this.resolveModerationStatusId('IN_REVIEW');
    return this.prisma.moderationQueue.update({ where: { id: queueId }, data: { assignedToUserId: moderatorUserId, statusId } });
  }

  async complete(queueId: string) {
    const item = await this.prisma.moderationQueue.findUnique({ where: { id: queueId } });
    if (!item) throw new NotFoundException({ code: 'MODERATION_001', message: 'Item introuvable' });
    const statusId = await this.resolveModerationStatusId('DONE');
    return this.prisma.moderationQueue.update({ where: { id: queueId }, data: { statusId } });
  }

  async enqueue(contentId: string, priority = 'NORMAL') {
    const priorityId = await this.resolveModerationPriorityId(priority);
    const statusId = await this.resolveModerationStatusId('PENDING');
    return this.prisma.moderationQueue.upsert({
      where: { contentId: contentId } as any,
      create: { contentId, priorityId, statusId },
      update: { priorityId, statusId },
    });
  }

  async listReports(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status: { code: status } } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentReport.findMany({
        where,
        include: {
          content: { select: { id: true, title: true, slug: true } },
          profile: { select: { name: true } },
          status: { select: { code: true, label: true } },
          reason: { select: { code: true, label: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.contentReport.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async reviewReport(reportId: string, adminUserId: string, action: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') {
    const report = await this.prisma.contentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException({ code: 'REPORT_001', message: 'Signalement introuvable' });
    const statusId = await this.resolveReportStatusId(action);
    return this.prisma.contentReport.update({ where: { id: reportId }, data: { statusId, reviewedByUserId: adminUserId } });
  }
}
