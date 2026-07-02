import { Prisma } from '@prisma/client';
import { resolveContentImageKeys } from './content-media.helper';

type MediaAssetRow = {
  objectKey: string;
  type?: { code: string } | null;
  isPrimary?: boolean;
};

/** Forme catalogue alignée sur GET /contents (cartes viewer). */
export function mapContentToCatalogCard(content: {
  id: string;
  title: string;
  slug?: string | null;
  duration?: number | null;
  releaseYear?: number | null;
  isExclusive?: boolean;
  ppvPrice?: number | null;
  visibility?: { code: string } | null;
  contentType?: { code?: string; typeCode?: string; label?: string } | null;
  contentGenres?: Array<{ genre?: { code: string; label: string } | null }>;
  contentStats?: { averageRating?: number | null } | null;
  creator?: unknown;
  mediaAssets?: MediaAssetRow[];
  videoAssets?: Array<{ posterObjectKey?: string | null }>;
}) {
  const assets = content.mediaAssets ?? [];
  const videoPoster = content.videoAssets?.[0]?.posterObjectKey ?? null;
  const images = resolveContentImageKeys(assets, videoPoster);
  const ct = content.contentType;
  const typeCode = ct?.code ?? ct?.typeCode ?? null;

  return {
    id: content.id,
    title: content.title,
    slug: content.slug ?? undefined,
    duration: content.duration ?? null,
    releaseYear: content.releaseYear ?? null,
    isExclusive: content.isExclusive ?? false,
    ppvPrice: content.ppvPrice ?? null,
    visibility: content.visibility?.code ?? null,
    averageRating: content.contentStats?.averageRating ?? 0,
    contentType: typeCode
      ? { code: typeCode, label: ct?.label ?? typeCode }
      : null,
    genres:
      content.contentGenres?.map((cg) => cg.genre).filter(Boolean) ?? [],
    creator: content.creator,
    ...images,
    mediaAssets: assets.map((a) => ({
      objectKey: a.objectKey,
      type: { code: a.type?.code ?? 'POSTER' },
      isPrimary: a.isPrimary ?? false,
    })),
  };
}

/** Include Prisma réutilisable pour les listes cartes catalogue. */
export const CATALOG_CARD_CONTENT_INCLUDE = Prisma.validator<Prisma.ContentInclude>()({
  contentGenres: { include: { genre: { select: { code: true, label: true } } } },
  creator: {
    select: { id: true, stageName: true, verified: true, avatarObjectKey: true },
  },
  contentStats: { select: { popularityScore: true, averageRating: true } },
  contentType: { select: { code: true, typeCode: true, label: true } },
  visibility: { select: { code: true } },
  mediaAssets: {
    where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    select: {
      objectKey: true,
      type: { select: { code: true } },
      isPrimary: true,
    },
  },
  videoAssets: {
    where: {
      episodeId: null,
      status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { posterObjectKey: true },
  },
});
