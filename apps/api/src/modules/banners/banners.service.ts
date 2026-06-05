import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { randomUUID } from 'crypto';

interface BannerWriteDto {
  bannerType?: string;
  title?: string;
  subtitle?: string;
  contentId?: string;
  imageObjectKey?: string;
  imageObjectKeyMobile?: string;
  linkUrl?: string;
  ctaLabel?: string;
  ctaStyle?: string;
  badgeText?: string;
  position?: number;
  targetPlanIds?: string[];
  countryIds?: string[];
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

@Injectable()
export class BannersService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async listActive(planCode?: string, countryCode?: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          planCode
            ? {
                OR: [
                  { targetPlanIds: { isEmpty: true } },
                  { targetPlanIds: { has: planCode } },
                ],
              }
            : {},
          countryCode
            ? {
                OR: [
                  { countryIds: { isEmpty: true } },
                  { countryIds: { has: countryCode } },
                ],
              }
            : {},
        ],
      },
      include: { content: { select: { id: true, title: true, slug: true } } },
      orderBy: { position: 'asc' },
    });
  }

  async listAll() {
    return this.prisma.banner.findMany({
      include: { content: { select: { id: true, title: true, slug: true } } },
      orderBy: { position: 'asc' },
    });
  }

  async getUploadUrl(mimeType: string, slot: 'desktop' | 'mobile') {
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const objectKey = `banners/${slot}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.minio.presignedPutUrl(this.minio.bucketAssets, objectKey);
    return { uploadUrl, objectKey };
  }

  async create(dto: BannerWriteDto) {
    return this.prisma.banner.create({
      data: {
        bannerType: dto.bannerType ?? 'EDITORIAL',
        title: dto.title!,
        subtitle: dto.subtitle,
        contentId: dto.contentId || null,
        imageObjectKey: dto.imageObjectKey || null,
        imageObjectKeyMobile: dto.imageObjectKeyMobile || null,
        linkUrl: dto.linkUrl || null,
        ctaLabel: dto.ctaLabel || null,
        ctaStyle: dto.ctaStyle ?? 'PRIMARY',
        badgeText: dto.badgeText || null,
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
        ...(dto.bannerType !== undefined && { bannerType: dto.bannerType }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.subtitle !== undefined && { subtitle: dto.subtitle }),
        ...(dto.contentId !== undefined && { contentId: dto.contentId || null }),
        ...(dto.imageObjectKey !== undefined && { imageObjectKey: dto.imageObjectKey || null }),
        ...(dto.imageObjectKeyMobile !== undefined && { imageObjectKeyMobile: dto.imageObjectKeyMobile || null }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl || null }),
        ...(dto.ctaLabel !== undefined && { ctaLabel: dto.ctaLabel || null }),
        ...(dto.ctaStyle !== undefined && { ctaStyle: dto.ctaStyle }),
        ...(dto.badgeText !== undefined && { badgeText: dto.badgeText || null }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.targetPlanIds !== undefined && { targetPlanIds: dto.targetPlanIds }),
        ...(dto.countryIds !== undefined && { countryIds: dto.countryIds }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
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

  async trackImpression(id: string) {
    await this.prisma.banner.updateMany({
      where: { id },
      data: { impressionCount: { increment: 1 } },
    });
  }

  async trackClick(id: string) {
    await this.prisma.banner.updateMany({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });
  }
}
