import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async defaultProfile(userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    return profile;
  }

  private async refId(model: any, code: string): Promise<string> {
    const ref = await model.findUniqueOrThrow({ where: { code } });
    return ref.id;
  }

  private readonly include = {
    reason: { select: { code: true, label: true } },
    status: { select: { code: true, label: true } },
    profile: { select: { name: true, avatarUrl: true } },
    content: { select: { title: true, slug: true } },
  };

  async create(userId: string, contentId: string, dto: { reason: string; description?: string }) {
    const profile = await this.defaultProfile(userId);

    const pendingStatus = await this.prisma.refReportStatus.findUnique({ where: { code: 'PENDING' }, select: { id: true } });
    if (!pendingStatus) throw new Error('Référentiel report_statuses non initialisé');

    const existing = await this.prisma.contentReport.findFirst({
      where: { profileId: profile.id, contentId, statusId: pendingStatus.id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({ code: 'REPORT_001', message: 'Un signalement est déjà en attente pour ce contenu' });
    }

    const [reasonId, statusId] = await Promise.all([
      this.refId(this.prisma.refReportReason, dto.reason),
      Promise.resolve(pendingStatus.id),
    ]);

    return this.prisma.contentReport.create({
      data: { profileId: profile.id, contentId, reasonId, statusId, description: dto.description },
      include: this.include,
    });
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentReport.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.include,
      }),
      this.prisma.contentReport.count(),
    ]);
    return { items, total, page, limit };
  }

  async updateStatus(id: string, status: string, adminUserId: string) {
    const report = await this.prisma.contentReport.findUnique({ where: { id }, select: { id: true } });
    if (!report) throw new NotFoundException({ code: 'REPORT_002', message: 'Signalement introuvable' });

    const statusId = await this.refId(this.prisma.refReportStatus, status);

    return this.prisma.contentReport.update({
      where: { id },
      data: { statusId, reviewedByUserId: adminUserId },
      include: this.include,
    });
  }

  async getByContent(contentId: string) {
    return this.prisma.contentReport.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
      include: this.include,
    });
  }
}
