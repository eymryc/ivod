import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRightsholderDto, UpdateRightsholderDto } from './dto/rightsholders.dto';

@Injectable()
export class RightsholdersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.rightsholder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  getOne(id: string) {
    return this.prisma.rightsholder.findUnique({
      where: { id },
    });
  }

  create(dto: CreateRightsholderDto) {
    return this.prisma.rightsholder.create({ data: dto });
  }

  async update(id: string, dto: UpdateRightsholderDto) {
    const existing = await this.prisma.rightsholder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    return this.prisma.rightsholder.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.rightsholder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    await this.prisma.rightsholder.delete({ where: { id } });
    return { id, message: 'Ayant droit supprime' };
  }
}
