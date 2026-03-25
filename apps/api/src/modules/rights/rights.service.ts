import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContentRightDto,
  CreateRightsContractDto,
  UpdateContentRightDto,
  UpdateRightsContractDto,
} from './dto/rights.dto';

@Injectable()
export class RightsService {
  constructor(private readonly prisma: PrismaService) {}

  listContracts() {
    return this.prisma.rightsContract.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  getContract(id: string) {
    return this.prisma.rightsContract.findUnique({
      where: { id },
      include: { contentRights: true },
    });
  }

  async createContract(dto: CreateRightsContractDto) {
    const holder = await this.prisma.rightsholder.findUnique({ where: { id: dto.rightsholderId } });
    if (!holder) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    if (dto.distributorId) {
      const distributor = await this.prisma.rightsholder.findUnique({ where: { id: dto.distributorId } });
      if (!distributor) throw new NotFoundException({ code: 'RIGHTSHOLDER_002', message: 'Distributeur introuvable' });
    }
    return this.prisma.rightsContract.create({
      data: {
        ...dto,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async updateContract(id: string, dto: UpdateRightsContractDto) {
    const existing = await this.prisma.rightsContract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_001', message: 'Contrat introuvable' });
    if (dto.rightsholderId) {
      const holder = await this.prisma.rightsholder.findUnique({ where: { id: dto.rightsholderId } });
      if (!holder) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    }
    if (dto.distributorId) {
      const distributor = await this.prisma.rightsholder.findUnique({ where: { id: dto.distributorId } });
      if (!distributor) throw new NotFoundException({ code: 'RIGHTSHOLDER_002', message: 'Distributeur introuvable' });
    }

    return this.prisma.rightsContract.update({
      where: { id },
      data: {
        ...dto,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async removeContract(id: string) {
    const existing = await this.prisma.rightsContract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_001', message: 'Contrat introuvable' });
    await this.prisma.rightsContract.delete({ where: { id } });
    return { id, message: 'Contrat supprimé' };
  }

  listContentRights(contentId?: string) {
    return this.prisma.contentRight.findMany({
      where: contentId ? { contentId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        content: { select: { id: true, title: true } },
        contract: {
          select: {
            id: true,
            contractRef: true,
            rightsholderId: true,
            distributorId: true,
            rightsholder: { select: { id: true, displayName: true, type: true } },
            distributor: { select: { id: true, displayName: true, type: true } },
          },
        },
      },
    });
  }

  createContentRight(dto: CreateContentRightDto) {
    return this.prisma.contentRight.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async updateContentRight(id: string, dto: UpdateContentRightDto) {
    const existing = await this.prisma.contentRight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_002', message: 'Droit contenu introuvable' });

    return this.prisma.contentRight.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async removeContentRight(id: string) {
    const existing = await this.prisma.contentRight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_002', message: 'Droit contenu introuvable' });
    await this.prisma.contentRight.delete({ where: { id } });
    return { id, message: 'Droit contenu supprimé' };
  }
}
