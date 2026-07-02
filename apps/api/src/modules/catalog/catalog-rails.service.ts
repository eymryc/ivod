import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CATALOG_RAILS_REGISTRY,
  CATALOG_SURFACE_SECTION_TITLES,
} from './config/rails.registry';
import {
  CATALOG_SURFACE_CONTENT_TYPE,
  isDedicatedCatalogSurface,
} from './domain/catalog-rail.constants';
import { applyCatalogDepthPolicy } from './domain/catalog-rail.policy';
import { CatalogRailsRepository } from './catalog-rails.repository';
import { seedCatalogRails } from './config/editorial-rails.seed';
import type {
  CatalogRailDto,
  CatalogRailDefinition,
  CatalogRailQuery,
  CatalogRailSurface,
} from './domain/catalog-rail.types';

@Injectable()
export class CatalogRailsService {
  constructor(private readonly repo: CatalogRailsRepository) {}

  async listForSurface(surface: CatalogRailSurface): Promise<CatalogRailDto[]> {
    const count = await this.repo.countAll();
    if (count === 0) {
      await seedCatalogRails(this.repo);
    }

    const rows = await this.repo.findActiveForSurface(surface);
    if (!rows.length) {
      const dtos = CATALOG_RAILS_REGISTRY.filter((r) =>
        r.surfaces.includes(surface),
      ).map((r) => this.definitionToDto(r, surface));
      return this.applySurfacePolicy(surface, dtos);
    }

    const dtos = rows.map((row) => this.rowToDto(row, surface));
    return this.applySurfacePolicy(surface, dtos);
  }

  private async applySurfacePolicy(
    surface: CatalogRailSurface,
    rails: CatalogRailDto[],
  ): Promise<CatalogRailDto[]> {
    if (!isDedicatedCatalogSurface(surface)) return rails;

    const contentType = CATALOG_SURFACE_CONTENT_TYPE[surface];

    const publishedCount =
      await this.repo.countPublishedByContentType(contentType);
    return applyCatalogDepthPolicy(rails, publishedCount);
  }

  async listLegacyHomeSections() {
    const rails = await this.listForSurface('home');
    return rails.map((rail) => this.toLegacyHomeSection(rail));
  }

  async listForAdmin(surface?: CatalogRailSurface) {
    const count = await this.repo.countAll();
    if (count === 0) {
      await seedCatalogRails(this.repo);
    }
    return this.repo.findAllForAdmin(surface);
  }

  async updateRail(
    code: string,
    data: {
      title?: string;
      subtitle?: string | null;
      isActive?: boolean;
      link?: string | null;
      startsAt?: string | null;
      endsAt?: string | null;
    },
  ) {
    const existing = await this.repo.findByCode(code);
    if (!existing) {
      throw new NotFoundException({ code: 'CATALOG_002', message: 'Rail introuvable' });
    }
    return this.repo.updateByCode(code, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.link !== undefined && { link: data.link }),
      ...(data.startsAt !== undefined && {
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
      }),
      ...(data.endsAt !== undefined && {
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      }),
    });
  }

  async reorderRails(surface: CatalogRailSurface, codes: string[]) {
    await this.repo.reorder(surface, codes);
    return { success: true };
  }

  async setRailItems(code: string, contentIds: string[]) {
    const rail = await this.repo.findByCode(code);
    if (!rail) {
      throw new NotFoundException({ code: 'CATALOG_002', message: 'Rail introuvable' });
    }
    if (rail.type !== 'editorial') {
      throw new NotFoundException({
        code: 'CATALOG_003',
        message: 'Seuls les rails éditoriaux acceptent une liste de contenus',
      });
    }
    await this.repo.setItems(rail.id, contentIds);
    return this.repo.findByCode(code);
  }

  async createEditorialRail(data: {
    code: string;
    title: string;
    surfaces: CatalogRailSurface[];
    subtitle?: string;
    link?: string;
    hideIfEmpty?: boolean;
  }) {
    const maxPos = await this.repo.countAll();
    return this.repo.createEditorial({
      code: data.code,
      title: data.title,
      subtitle: data.subtitle ?? null,
      surfaces: data.surfaces,
      type: 'editorial',
      hideIfEmpty: data.hideIfEmpty ?? true,
      position: maxPos,
      link: data.link ?? null,
    });
  }

  private rowToDto(
    row: {
      code: string;
      title: string;
      subtitle: string | null;
      type: string;
      personalizedKind: string | null;
      requiresAuth: boolean;
      hideIfEmpty: boolean;
      titleMode: string | null;
      link: string | null;
      queryJson: unknown;
      items: { contentId: string }[];
    },
    surface: CatalogRailSurface,
  ): CatalogRailDto {
    const sectionTitle =
      surface !== 'home'
        ? CATALOG_SURFACE_SECTION_TITLES[surface]
        : row.subtitle ?? undefined;

    const baseTitle = row.title;
    const title =
      row.titleMode === 'with-section' && sectionTitle
        ? `${baseTitle} – ${sectionTitle}`
        : baseTitle;

    const query = (row.queryJson ?? undefined) as CatalogRailQuery | undefined;

    return {
      id: row.code,
      code: row.code,
      title,
      subtitle: row.subtitle ?? undefined,
      type: row.type as CatalogRailDto['type'],
      personalizedKind: (row.personalizedKind ?? undefined) as CatalogRailDto['personalizedKind'],
      requiresAuth: row.requiresAuth,
      hideIfEmpty: row.hideIfEmpty,
      query,
      link: row.link ?? undefined,
      contentIds:
        row.type === 'editorial'
          ? row.items.map((i) => i.contentId)
          : undefined,
    };
  }

  private definitionToDto(rail: CatalogRailDefinition, surface: CatalogRailSurface): CatalogRailDto {
    const sectionTitle =
      surface !== 'home'
        ? CATALOG_SURFACE_SECTION_TITLES[surface]
        : rail.subtitle;

    const title =
      rail.titleMode === 'with-section' && sectionTitle
        ? `${rail.title} – ${sectionTitle}`
        : rail.title;

    return {
      id: rail.id,
      code: rail.id,
      title,
      subtitle: rail.subtitle,
      type: rail.type,
      personalizedKind: rail.personalizedKind,
      requiresAuth: rail.requiresAuth,
      hideIfEmpty: rail.hideIfEmpty,
      query: rail.query,
      link: rail.link,
    };
  }

  private toLegacyHomeSection(rail: CatalogRailDto) {
    if (rail.type === 'personalized' && rail.personalizedKind) {
      return {
        id: rail.code,
        title: rail.title,
        type: rail.personalizedKind,
        requiresAuth: rail.requiresAuth ?? false,
        hideIfEmpty: rail.hideIfEmpty ?? true,
      };
    }

    if (rail.type === 'editorial') {
      return {
        id: rail.code,
        title: rail.title,
        type: 'catalog_query',
        hideIfEmpty: rail.hideIfEmpty ?? true,
        params: {
          contentIds: rail.contentIds,
          limit: rail.contentIds?.length ?? 0,
        },
      };
    }

    const p = rail.query ?? {};
    if (rail.code === 'trending') {
      return {
        id: rail.code,
        title: rail.title,
        type: 'trending',
        hideIfEmpty: rail.hideIfEmpty ?? true,
        params: { period: '30d' },
      };
    }

    return {
      id: rail.code,
      title: rail.title,
      type: 'catalog_query',
      hideIfEmpty: rail.hideIfEmpty ?? true,
      params: {
        contentType: p.contentType,
        genre: p.genre ?? p.genreCodes?.[0],
        sort: p.sort,
        limit: p.limit,
        isExclusive: p.isExclusive,
        countryOfOrigin: p.countryOfOrigin,
        publishedWithinDays: p.publishedWithinDays,
        minRating: p.minRating,
        genreCodes: p.genreCodes,
      },
    };
  }
}
