import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { ContentsService } from '../contents/contents.service';
import { RedisService } from '../../common/services/redis.service';
import type {
  CatalogRailDto,
  CatalogRailDefinition,
  CatalogRailQuery,
  CatalogRailSurface,
  ResolvedCatalogRailDto,
} from './domain/catalog-rail.types';

/** TTL du cache des rails résolus — les rails changent rarement (admin only). */
const RESOLVED_RAILS_CACHE_TTL_SEC = 180;

@Injectable()
export class CatalogRailsService {
  constructor(
    private readonly repo: CatalogRailsRepository,
    private readonly contents: ContentsService,
    private readonly redis: RedisService,
  ) {}

  async listForSurface(
    surface: CatalogRailSurface,
    opts?: { planCode?: string; countryCode?: string },
  ): Promise<CatalogRailDto[]> {
    const count = await this.repo.countAll();
    if (count === 0) {
      await seedCatalogRails(this.repo);
    }

    const rows = await this.repo.findActiveForSurface(surface, opts);
    if (!rows.length) {
      const dtos = CATALOG_RAILS_REGISTRY.filter((r) =>
        r.surfaces.includes(surface),
      ).map((r) => this.definitionToDto(r, surface));
      return this.applySurfacePolicy(surface, dtos);
    }

    const dtos = rows.map((row) => this.rowToDto(row, surface));
    return this.applySurfacePolicy(surface, dtos);
  }

  /**
   * Comme listForSurface, mais résout aussi les contenus de chaque rail
   * query/editorial côté serveur (au lieu de laisser le client faire un
   * GET /contents par rail). Résultat mis en cache Redis par surface —
   * les rails eux-mêmes ne changent qu'via l'admin, donc un TTL de
   * quelques minutes absorbe l'essentiel du trafic homepage sans jamais
   * servir des contenus obsolètes plus de RESOLVED_RAILS_CACHE_TTL_SEC.
   */
  async resolveForSurface(
    surface: CatalogRailSurface,
    opts?: { maxMaturityRating?: string; planCode?: string; countryCode?: string },
  ): Promise<ResolvedCatalogRailDto[]> {
    const cacheKey = [
      'catalog:resolved',
      surface,
      opts?.maxMaturityRating ?? 'all',
      opts?.planCode ?? 'all',
      opts?.countryCode ?? 'all',
    ].join(':');
    return this.redis.remember(cacheKey, RESOLVED_RAILS_CACHE_TTL_SEC, async () => {
      const rails = await this.listForSurface(surface, opts);

      return Promise.all(
        rails.map(async (rail): Promise<ResolvedCatalogRailDto> => {
          if (rail.type === 'personalized') {
            return { ...rail, items: [] };
          }
          if (rail.type === 'editorial') {
            if (!rail.contentIds?.length) return { ...rail, items: [] };
            const result = await this.contents.findAll({
              ids: rail.contentIds.join(','),
              maxMaturityRating: opts?.maxMaturityRating,
              limit: rail.contentIds.length,
            });
            return { ...rail, items: (result as { items: unknown[] }).items };
          }
          // type === 'query'
          const q = rail.query ?? {};
          const result = await this.contents.findAll({
            contentType: q.contentType,
            genre: q.genre,
            genreCodes: q.genreCodes?.join(','),
            sort: q.sort,
            limit: q.limit ?? 20,
            isExclusive: q.isExclusive,
            countryOfOrigin: q.countryOfOrigin,
            publishedWithinDays: q.publishedWithinDays,
            minRating: q.minRating,
            releaseYearFrom: q.releaseYearFrom,
            releaseYearTo: q.releaseYearTo,
            maxMaturityRating: opts?.maxMaturityRating,
          } as never);
          return { ...rail, items: (result as { items: unknown[] }).items };
        }),
      );
    });
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
      targetPlanCodes?: string[];
      targetCountryCodes?: string[];
      query?: CatalogRailQuery;
    },
  ) {
    const existing = await this.repo.findByCode(code);
    if (!existing) {
      throw new NotFoundException({ code: 'CATALOG_002', message: 'Rail introuvable' });
    }
    if (data.query !== undefined && existing.type !== 'query') {
      throw new BadRequestException({
        code: 'CATALOG_008',
        message: 'Seuls les rails dynamiques (type query) acceptent des critères de filtre',
      });
    }
    const updated = await this.repo.updateByCode(code, {
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
      ...(data.targetPlanCodes !== undefined && { targetPlanCodes: data.targetPlanCodes }),
      ...(data.targetCountryCodes !== undefined && { targetCountryCodes: data.targetCountryCodes }),
      ...(data.query !== undefined && { queryJson: data.query as object }),
    });
    await this.redis.delPattern('catalog:resolved:*');
    return updated;
  }

  async reorderRails(surface: CatalogRailSurface, codes: string[]) {
    const existing = await this.repo.codesForSurface(surface);
    const existingSet = new Set(existing);
    const incomingSet = new Set(codes);

    const unknown = codes.filter((c) => !existingSet.has(c));
    if (unknown.length) {
      throw new BadRequestException({
        code: 'CATALOG_004',
        message: `Codes inconnus pour cette surface : ${unknown.join(', ')}`,
      });
    }
    const missing = existing.filter((c) => !incomingSet.has(c));
    if (missing.length) {
      throw new BadRequestException({
        code: 'CATALOG_005',
        message: `La liste doit inclure tous les rails de la surface — manquants : ${missing.join(', ')}`,
      });
    }

    await this.repo.reorder(surface, codes);
    await this.redis.delPattern('catalog:resolved:*');
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
    if (contentIds.length) {
      const existingIds = new Set(await this.repo.findExistingContentIds(contentIds));
      const unknown = contentIds.filter((id) => !existingIds.has(id));
      if (unknown.length) {
        throw new BadRequestException({
          code: 'CATALOG_006',
          message: `Contenus introuvables : ${unknown.join(', ')}`,
        });
      }
    }
    await this.repo.setItems(rail.id, contentIds);
    await this.redis.delPattern('catalog:resolved:*');
    return this.repo.findByCode(code);
  }

  async createRail(data: {
    code: string;
    title: string;
    surfaces: CatalogRailSurface[];
    subtitle?: string;
    link?: string;
    hideIfEmpty?: boolean;
    type?: 'editorial' | 'query';
    query?: CatalogRailQuery;
    targetPlanCodes?: string[];
    targetCountryCodes?: string[];
  }) {
    const existing = await this.repo.findByCode(data.code);
    if (existing) {
      throw new BadRequestException({
        code: 'CATALOG_007',
        message: `Un rail avec le code "${data.code}" existe déjà`,
      });
    }
    const type = data.type ?? 'editorial';
    if (type === 'query' && !data.query) {
      throw new BadRequestException({
        code: 'CATALOG_009',
        message: 'Un rail dynamique nécessite des critères de filtre (query)',
      });
    }
    const position = (await this.repo.maxPosition()) + 1;
    const created = await this.repo.createEditorial({
      code: data.code,
      title: data.title,
      subtitle: data.subtitle ?? null,
      surfaces: data.surfaces,
      type,
      hideIfEmpty: data.hideIfEmpty ?? true,
      position,
      link: data.link ?? null,
      targetPlanCodes: data.targetPlanCodes ?? [],
      targetCountryCodes: data.targetCountryCodes ?? [],
      ...(type === 'query' && data.query ? { queryJson: data.query as object } : {}),
    });
    await this.redis.delPattern('catalog:resolved:*');
    return created;
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
      targetPlanCodes?: string[];
      targetCountryCodes?: string[];
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
      targetPlanCodes: row.targetPlanCodes ?? [],
      targetCountryCodes: row.targetCountryCodes ?? [],
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
