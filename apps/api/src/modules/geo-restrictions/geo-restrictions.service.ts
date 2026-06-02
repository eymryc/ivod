import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GeoRestrictionsService {
  constructor(private prisma: PrismaService) {}

  async listForContent(contentId: string) {
    return this.prisma.geoRestriction.findMany({
      where: { contentId },
      include: { country: { select: { isoCode: true, label: true, region: true } } },
    });
  }

  async isAvailableIn(contentId: string, isoCode: string): Promise<boolean> {
    const country = await this.prisma.refCountry.findUnique({ where: { isoCode }, select: { id: true } });
    if (!country) return true;
    const restriction = await this.prisma.geoRestriction.findUnique({
      where: { contentId_countryId: { contentId, countryId: country.id } },
    });
    if (!restriction) return true;
    return restriction.mode === 'ALLOW';
  }

  async set(contentId: string, isoCode: string, mode: 'ALLOW' | 'BLOCK', reason?: string) {
    if (!await this.prisma.content.findUnique({ where: { id: contentId } })) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    const country = await this.prisma.refCountry.findUnique({ where: { isoCode } });
    if (!country) throw new NotFoundException({ code: 'COUNTRY_001', message: 'Pays introuvable' });
    return this.prisma.geoRestriction.upsert({
      where: { contentId_countryId: { contentId, countryId: country.id } },
      create: { contentId, countryId: country.id, mode, reason },
      update: { mode, reason },
    });
  }

  async remove(contentId: string, isoCode: string) {
    const country = await this.prisma.refCountry.findUnique({ where: { isoCode } });
    if (!country) throw new NotFoundException({ code: 'COUNTRY_001', message: 'Pays introuvable' });
    await this.prisma.geoRestriction.delete({
      where: { contentId_countryId: { contentId, countryId: country.id } },
    });
    return { message: 'Restriction supprimée' };
  }
}
