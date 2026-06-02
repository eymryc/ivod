import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface BannerWriteDto {
  title?: string;
  subtitle?: string;
  contentId?: string;
  imageObjectKey?: string;
  linkUrl?: string;
  position?: number;
  targetPlanIds?: string[];
  countryIds?: string[];
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async listActive(planCode?: string, countryCode?: string) {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { content: { select: { id: true, title: true, slug: true } } },
      orderBy: { position: 'asc' },
    });
    return banners.filter(b => {
      if (planCode && b.targetPlanIds.length > 0 && !b.targetPlanIds.includes(planCode)) return false;
      if (countryCode && b.countryIds.length > 0 && !b.countryIds.includes(countryCode)) return false;
      return true;
    });
  }

  async create(dto: BannerWriteDto) {
    return this.prisma.banner.create({
      data: {
        title: dto.title!,
        subtitle: dto.subtitle,
        contentId: dto.contentId,
        imageObjectKey: dto.imageObjectKey!,
        linkUrl: dto.linkUrl,
        position: dto.position ?? 0,
        targetPlanIds: dto.targetPlanIds ?? [],
        countryIds: dto.countryIds ?? [],
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async update(id: string, dto: BannerWriteDto) {
    if (!await this.prisma.banner.findUnique({ where: { id } })) {
      throw new NotFoundException({ code: 'BANNER_001', message: 'Bannière introuvable' });
    }
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    if (!await this.prisma.banner.findUnique({ where: { id } })) {
      throw new NotFoundException({ code: 'BANNER_001', message: 'Bannière introuvable' });
    }
    await this.prisma.banner.delete({ where: { id } });
    return { message: 'Bannière supprimée' };
  }
}
