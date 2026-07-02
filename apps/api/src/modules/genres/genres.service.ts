import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.refGenre.findMany({ where: { isActive: true }, orderBy: { label: 'asc' } }); }
  async findOne(slug: string) {
    const genre = await this.prisma.refGenre.findUnique({ where: { slug } });
    if (!genre) throw new NotFoundException({ code: 'GENRE_001', message: 'Genre introuvable' });
    return genre;
  }
  async contentsByGenre(slug: string, page = 1, limit = 20) {
    const genre = await this.prisma.refGenre.findUnique({ where: { slug }, select: { id: true, code: true, label: true } });
    if (!genre) throw new NotFoundException({ code: 'GENRE_001', message: 'Genre introuvable' });
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where: { status: { code: 'PUBLISHED' }, contentGenres: { some: { genreId: genre.id } } },
        include: {
          creator: { select: { id: true, stageName: true } },
          contentType: { select: { code: true } },
          mediaAssets: { where: { type: { code: 'THUMBNAIL' }, isPrimary: true }, take: 1, select: { objectKey: true } },
        },
        orderBy: { viewCount: 'desc' },
        skip, take: limit,
      }),
      this.prisma.content.count({ where: { status: { code: 'PUBLISHED' }, contentGenres: { some: { genreId: genre.id } } } }),
    ]);
    return { genre, items: items.map(c => ({ ...c, thumbnailObjectKey: (c as any).mediaAssets?.[0]?.objectKey ?? null, mediaAssets: undefined })), total, page, limit };
  }
}
