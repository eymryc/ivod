import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AwardsService {
  constructor(private prisma: PrismaService) {}

  async listForContent(contentId: string) {
    return this.prisma.contentAward.findMany({
      where: { contentId },
      include: {
        award: { include: { type: { select: { id: true, code: true, label: true } } } },
      },
    });
  }

  async create(typeCode: string, name: string, category?: string, year?: number) {
    const type = await this.prisma.refAwardType.findUnique({ where: { code: typeCode } });
    if (!type) {
      throw new NotFoundException({
        code: 'AWARD_TYPE_001',
        message: `Type de distinction inconnu : ${typeCode}. Configurez-le dans Admin → Références.`,
      });
    }
    return this.prisma.award.create({ data: { typeId: type.id, name, category, year: year ?? new Date().getFullYear() } });
  }

  async linkToContent(contentId: string, awardId: string, won = true) {
    if (!await this.prisma.content.findUnique({ where: { id: contentId } })) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (!await this.prisma.award.findUnique({ where: { id: awardId } })) throw new NotFoundException({ code: 'AWARD_001', message: 'Récompense introuvable' });
    return this.prisma.contentAward.upsert({
      where: { contentId_awardId: { contentId, awardId } },
      create: { contentId, awardId, won },
      update: { won },
    });
  }

  async unlink(contentId: string, awardId: string) {
    await this.prisma.contentAward.delete({ where: { contentId_awardId: { contentId, awardId } } });
    return { message: 'Récompense dissociée' };
  }
}
