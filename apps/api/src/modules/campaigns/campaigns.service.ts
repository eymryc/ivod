import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  private async resolveTypeId(code: string): Promise<string> {
    const ref = await this.prisma.refCampaignType.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        include: { type: { select: { code: true, label: true } } },
        orderBy: { startsAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.campaign.count(),
    ]);
    return { items, total, page, limit };
  }

  async listActive() {
    const now = new Date();
    return this.prisma.campaign.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { type: { select: { code: true, label: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async create(dto: { name: string; description?: string; type: string; startsAt: string; endsAt: string; metadata?: any }) {
    const typeId = await this.resolveTypeId(dto.type);
    const { type: _type, ...rest } = dto;
    return this.prisma.campaign.create({
      data: { ...rest, typeId, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) },
    });
  }

  async update(id: string, dto: Partial<{ name: string; description: string; isActive: boolean; metadata: any }>) {
    if (!await this.prisma.campaign.findUnique({ where: { id } })) throw new NotFoundException({ code: 'CAMPAIGN_001', message: 'Campagne introuvable' });
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    if (!await this.prisma.campaign.findUnique({ where: { id } })) throw new NotFoundException({ code: 'CAMPAIGN_001', message: 'Campagne introuvable' });
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campagne supprimée' };
  }
}
