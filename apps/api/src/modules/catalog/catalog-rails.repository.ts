import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CatalogRailSurface } from './domain/catalog-rail.types';

@Injectable()
export class CatalogRailsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveForSurface(surface: CatalogRailSurface, now = new Date()) {
    return this.prisma.editorialRail.findMany({
      where: {
        isActive: true,
        surfaces: { has: surface },
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: { position: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          select: { contentId: true, position: true },
        },
      },
    });
  }

  findAllForAdmin(surface?: CatalogRailSurface) {
    return this.prisma.editorialRail.findMany({
      where: surface ? { surfaces: { has: surface } } : undefined,
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { position: 'asc' },
          take: 5,
          select: {
            contentId: true,
            position: true,
            content: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.editorialRail.findUnique({
      where: { code },
      include: {
        items: {
          orderBy: { position: 'asc' },
          select: { contentId: true, position: true },
        },
      },
    });
  }

  upsertFromRegistry(data: {
    code: string;
    title: string;
    subtitle?: string | null;
    surfaces: string[];
    type: string;
    personalizedKind?: string | null;
    requiresAuth?: boolean;
    hideIfEmpty?: boolean;
    position: number;
    titleMode?: string | null;
    link?: string | null;
    queryJson?: Prisma.InputJsonValue;
  }) {
    const payload = {
      code: data.code,
      title: data.title,
      subtitle: data.subtitle ?? null,
      surfaces: data.surfaces,
      type: data.type,
      personalizedKind: data.personalizedKind ?? null,
      requiresAuth: data.requiresAuth ?? false,
      hideIfEmpty: data.hideIfEmpty ?? true,
      position: data.position,
      titleMode: data.titleMode ?? null,
      link: data.link ?? null,
      ...(data.queryJson != null ? { queryJson: data.queryJson } : {}),
    };
    return this.prisma.editorialRail.upsert({
      where: { code: data.code },
      create: payload,
      update: payload,
    });
  }

  updateByCode(
    code: string,
    data: Prisma.EditorialRailUpdateInput,
  ) {
    return this.prisma.editorialRail.update({ where: { code }, data });
  }

  createEditorial(data: Prisma.EditorialRailCreateInput) {
    return this.prisma.editorialRail.create({ data });
  }

  async reorder(surface: CatalogRailSurface, codes: string[]) {
    await this.prisma.$transaction(
      codes.map((code, index) =>
        this.prisma.editorialRail.update({
          where: { code },
          data: { position: index },
        }),
      ),
    );
  }

  async setItems(railId: string, contentIds: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.editorialRailItem.deleteMany({ where: { railId } });
      if (contentIds.length) {
        await tx.editorialRailItem.createMany({
          data: contentIds.map((contentId, index) => ({
            railId,
            contentId,
            position: index,
          })),
        });
      }
    });
  }

  countAll() {
    return this.prisma.editorialRail.count();
  }

  /** Titres publiés et visibles sur le viewer (aligné sur GET /contents). */
  countPublishedByContentType(contentTypeCode: string) {
    return this.prisma.content.count({
      where: {
        contentType: { code: contentTypeCode },
        status: { code: 'PUBLISHED' },
        visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV'] } },
      },
    });
  }
}
