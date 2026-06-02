import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRightsholderDto, UpdateRightsholderDto } from './dto/rightsholders.dto';

@Injectable()
export class RightsholdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTypeId(typeCode: string): Promise<string> {
    const type = await this.prisma.refRightsholderType.findUnique({ where: { code: typeCode } });
    if (!type) throw new NotFoundException({ code: 'REF_001', message: `Type ayant droit inconnu: ${typeCode}` });
    return type.id;
  }

  private async resolveCountryId(isoCode: string): Promise<string> {
    const country = await this.prisma.refCountry.findUnique({ where: { isoCode } });
    if (!country) throw new NotFoundException({ code: 'REF_002', message: `Pays inconnu: ${isoCode}` });
    return country.id;
  }

  list() {
    return this.prisma.rightsholder.findMany({
      include: { type: { select: { code: true, label: true } }, country: { select: { isoCode: true, label: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getOne(id: string) {
    return this.prisma.rightsholder.findUnique({
      where: { id },
      include: { type: { select: { code: true, label: true } }, country: { select: { isoCode: true, label: true } } },
    });
  }

  async create(dto: CreateRightsholderDto) {
    const typeId = await this.resolveTypeId(dto.type);
    const countryId = dto.countryCode ? await this.resolveCountryId(dto.countryCode) : undefined;
    const { type, countryCode, ...rest } = dto;
    const row = await this.prisma.rightsholder.create({
      data: { ...rest, typeId, countryId },
      include: { type: { select: { code: true, label: true } }, country: { select: { isoCode: true, label: true } } },
    });
    return { ...row, message: 'Ayant droit créé' };
  }

  async update(id: string, dto: UpdateRightsholderDto) {
    const existing = await this.prisma.rightsholder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });

    const typeId = dto.type ? await this.resolveTypeId(dto.type) : undefined;
    const countryId = dto.countryCode ? await this.resolveCountryId(dto.countryCode) : undefined;
    const { type, countryCode, ...rest } = dto;
    const row = await this.prisma.rightsholder.update({
      where: { id },
      data: { ...rest, ...(typeId && { typeId }), ...(countryId && { countryId }) },
      include: { type: { select: { code: true, label: true } }, country: { select: { isoCode: true, label: true } } },
    });
    return { ...row, message: 'Ayant droit mis à jour' };
  }

  async remove(id: string) {
    const existing = await this.prisma.rightsholder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    if (existing.id === 'default_rightsholder') {
      throw new ConflictException({
        code: 'RIGHTSHOLDER_DEFAULT',
        message: 'L\'ayant droit par défaut de la plateforme ne peut pas être supprimé.',
      });
    }
    try {
      await this.prisma.rightsholder.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException({
          code: 'RIGHTSHOLDER_IN_USE',
          message: 'Cet ayant droit est lié à des contenus ou contrats.',
        });
      }
      throw err;
    }
    return { id, message: 'Ayant droit supprimé' };
  }
}
