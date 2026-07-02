import { Prisma, type PrismaClient } from '@prisma/client';
import { CATALOG_RAILS_REGISTRY } from './rails.registry';
import type { CatalogRailsRepository } from '../catalog-rails.repository';

/** Rails éditoriaux manuels (collections curées). */
const EXTRA_EDITORIAL_RAILS = [
  {
    code: 'selection_du_mois',
    title: 'Sélection du mois',
    surfaces: ['home'],
    type: 'editorial',
    hideIfEmpty: true,
    position: 35,
    link: '/films',
  },
  {
    code: 'festival_fespaco',
    title: 'Festival FESPACO',
    subtitle: 'Cinéma africain',
    surfaces: ['home', 'films'],
    type: 'editorial',
    hideIfEmpty: true,
    isActive: false,
    position: 36,
    link: '/films',
  },
] as const;

async function upsertRail(
  prisma: PrismaClient,
  data: {
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
    isActive?: boolean;
  },
) {
  await prisma.editorialRail.upsert({
    where: { code: data.code },
    create: {
      code: data.code,
      title: data.title,
      subtitle: data.subtitle ?? null,
      surfaces: data.surfaces,
      type: data.type,
      personalizedKind: data.personalizedKind ?? null,
      requiresAuth: data.requiresAuth ?? false,
      hideIfEmpty: data.hideIfEmpty ?? true,
      isActive: data.isActive ?? true,
      position: data.position,
      titleMode: data.titleMode ?? null,
      link: data.link ?? null,
      ...(data.queryJson != null ? { queryJson: data.queryJson } : {}),
    },
    update: {
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
      ...(data.queryJson != null ? { queryJson: data.queryJson } : { queryJson: Prisma.DbNull }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function seedCatalogRailsDb(prisma: PrismaClient) {
  let position = 0;
  for (const rail of CATALOG_RAILS_REGISTRY) {
    await upsertRail(prisma, {
      code: rail.id,
      title: rail.title,
      subtitle: rail.subtitle ?? null,
      surfaces: [...rail.surfaces],
      type: rail.type,
      personalizedKind: rail.personalizedKind ?? null,
      requiresAuth: rail.requiresAuth ?? false,
      hideIfEmpty: rail.hideIfEmpty ?? true,
      position: position++,
      titleMode: rail.titleMode ?? null,
      link: rail.link ?? null,
      queryJson: (rail.query ?? null) as Prisma.InputJsonValue,
    });
  }

  for (const rail of EXTRA_EDITORIAL_RAILS) {
    await upsertRail(prisma, {
      code: rail.code,
      title: rail.title,
      subtitle: 'subtitle' in rail ? (rail.subtitle ?? null) : null,
      surfaces: [...rail.surfaces],
      type: rail.type,
      personalizedKind: null,
      hideIfEmpty: rail.hideIfEmpty ?? true,
      position: rail.position,
      link: rail.link ?? null,
      isActive: 'isActive' in rail ? rail.isActive !== false : true,
    });
  }
}

export async function seedCatalogRails(repo: CatalogRailsRepository) {
  let position = 0;
  for (const rail of CATALOG_RAILS_REGISTRY) {
    await repo.upsertFromRegistry({
      code: rail.id,
      title: rail.title,
      subtitle: rail.subtitle ?? null,
      surfaces: [...rail.surfaces],
      type: rail.type,
      personalizedKind: rail.personalizedKind ?? null,
      requiresAuth: rail.requiresAuth ?? false,
      hideIfEmpty: rail.hideIfEmpty ?? true,
      position: position++,
      titleMode: rail.titleMode ?? null,
      link: rail.link ?? null,
      queryJson: (rail.query ?? null) as Prisma.InputJsonValue,
    });
  }

  for (const rail of EXTRA_EDITORIAL_RAILS) {
    await repo.upsertFromRegistry({
      code: rail.code,
      title: rail.title,
      subtitle: 'subtitle' in rail ? (rail.subtitle ?? null) : null,
      surfaces: [...rail.surfaces],
      type: rail.type,
      personalizedKind: null,
      requiresAuth: false,
      hideIfEmpty: rail.hideIfEmpty ?? true,
      position: rail.position,
      titleMode: null,
      link: rail.link ?? null,
    });
    if ('isActive' in rail && rail.isActive === false) {
      await repo.updateByCode(rail.code, { isActive: false });
    }
  }
}
