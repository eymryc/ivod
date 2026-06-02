import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = search ? { fullName: { contains: search, mode: 'insensitive' } } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.person.findMany({ where, orderBy: { fullName: 'asc' }, skip, take: limit }),
      this.prisma.person.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        contentCasts: {
          include: { content: { select: { id: true, title: true, slug: true, contentType: { select: { code: true } } } } },
          orderBy: { content: { publishedAt: 'desc' } },
          take: 20,
        },
        contentCrews: {
          include: {
            content: { select: { id: true, title: true, slug: true } },
            crewRole: { select: { id: true, code: true, label: true } },
          },
          orderBy: { content: { publishedAt: 'desc' } },
          take: 20,
        },
        birthCountry: { select: { isoCode: true, label: true } },
      },
    });
    if (!person) throw new NotFoundException({ code: 'PERSON_001', message: 'Personne introuvable' });
    return person;
  }

  async create(dto: any) {
    const person = await this.prisma.person.create({ data: dto });
    return { ...person, message: 'Personne enregistrée dans l\'annuaire' };
  }

  async update(id: string, dto: any) {
    if (!await this.prisma.person.findUnique({ where: { id } })) throw new NotFoundException({ code: 'PERSON_001', message: 'Personne introuvable' });
    return this.prisma.person.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    if (!await this.prisma.person.findUnique({ where: { id } })) throw new NotFoundException({ code: 'PERSON_001', message: 'Personne introuvable' });
    await this.prisma.person.delete({ where: { id } });
    return { message: 'Personne supprimée' };
  }

  async getCastForContent(contentId: string) {
    return this.prisma.contentCast.findMany({
      where: { contentId, episodeId: null },
      include: { person: { select: { id: true, fullName: true, stageName: true, avatarObjectKey: true, nationality: true } } },
      orderBy: [{ isMainCast: 'desc' }, { displayOrder: 'asc' }],
    });
  }

  async getCrewForContent(contentId: string) {
    return this.prisma.contentCrew.findMany({
      where: { contentId, episodeId: null },
      include: {
        person: { select: { id: true, fullName: true, stageName: true, avatarObjectKey: true } },
        crewRole: { select: { id: true, code: true, label: true } },
      },
    });
  }

  async addCast(
    contentId: string,
    personId: string,
    characterName?: string,
    displayOrder = 0,
    isMainCast = true,
  ) {
    if (!await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    if (!await this.prisma.person.findUnique({ where: { id: personId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'PERSON_001', message: 'Personne introuvable' });
    }
    const row = await this.prisma.contentCast.create({
      data: { contentId, personId, characterName, displayOrder, isMainCast },
    });
    return { ...row, message: 'Interprète associé au contenu' };
  }

  async updateCast(
    castId: string,
    dto: { characterName?: string | null; displayOrder?: number; isMainCast?: boolean },
  ) {
    const existing = await this.prisma.contentCast.findUnique({ where: { id: castId } });
    if (!existing) throw new NotFoundException({ code: 'CAST_001', message: 'Lien interprète introuvable' });
    const row = await this.prisma.contentCast.update({
      where: { id: castId },
      data: {
        ...(dto.characterName !== undefined ? { characterName: dto.characterName || null } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.isMainCast !== undefined ? { isMainCast: dto.isMainCast } : {}),
      },
      include: { person: { select: { id: true, fullName: true, stageName: true } } },
    });
    return { ...row, message: 'Interprète mis à jour' };
  }

  async updateCrew(crewId: string, dto: { crewRoleId?: string }) {
    const existing = await this.prisma.contentCrew.findUnique({ where: { id: crewId } });
    if (!existing) {
      throw new NotFoundException({ code: 'CREW_001', message: 'Lien équipe introuvable' });
    }
    if (dto.crewRoleId) {
      const role = await this.prisma.refCrewRole.findUnique({ where: { id: dto.crewRoleId } });
      if (!role) {
        throw new NotFoundException({
          code: 'CREW_ROLE_001',
          message: 'Fonction introuvable. Rechargez la page.',
        });
      }
    }
    const row = await this.prisma.contentCrew.update({
      where: { id: crewId },
      data: {
        ...(dto.crewRoleId ? { crewRoleId: dto.crewRoleId } : {}),
      },
      include: {
        person: { select: { id: true, fullName: true, stageName: true } },
        crewRole: { select: { id: true, code: true, label: true } },
      },
    });
    return { ...row, message: 'Membre de l\'équipe mis à jour' };
  }

  async addCrew(contentId: string, personId: string, crewRoleId: string) {
    if (!await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    const role = await this.prisma.refCrewRole.findUnique({ where: { id: crewRoleId } });
    if (!role) {
      throw new NotFoundException({
        code: 'CREW_ROLE_001',
        message:
          'Fonction introuvable. Rechargez la page ou demandez à un administrateur d\'ajouter les rôles dans Admin → Références → Rôles équipe.',
      });
    }
    if (!await this.prisma.person.findUnique({ where: { id: personId }, select: { id: true } })) {
      throw new NotFoundException({ code: 'PERSON_001', message: 'Personne introuvable' });
    }
    const row = await this.prisma.contentCrew.create({ data: { contentId, personId, crewRoleId } });
    return { ...row, message: 'Membre ajouté à l\'équipe technique' };
  }

  async removeCast(castId: string) {
    await this.prisma.contentCast.delete({ where: { id: castId } });
    return { message: 'Membre du casting supprimé' };
  }

  async removeCrew(crewId: string) {
    await this.prisma.contentCrew.delete({ where: { id: crewId } });
    return { message: 'Membre de l\'équipe technique supprimé' };
  }
}
