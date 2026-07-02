import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContentRightDto,
  CreateRightsContractDto,
  UpdateContentRightDto,
  UpdateRightsContractDto,
} from './dto/rights.dto';

function parseContractDate(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Date de contrat invalide' });
  }
  return d;
}

const contractInclude = {
  rightsholder: {
    select: { id: true, displayName: true, type: { select: { code: true, label: true } } },
  },
  distributor: { select: { id: true, displayName: true } },
  _count: { select: { contentRights: true } },
} as const;

@Injectable()
export class RightsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveMonetizationTypeId(code: string) {
    const ref = await this.prisma.refMonetizationType.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Type monétisation inconnu: ${code}` });
    return ref.id;
  }

  private async resolveTerritoryCodeId(code: string) {
    const ref = await this.prisma.refTerritoryCode.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_002', message: `Code territoire inconnu: ${code}` });
    return ref.id;
  }

  private async resolveContentRightStatusId(code: string) {
    const ref = await this.prisma.refContentRightStatus.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_003', message: `Statut de droit inconnu: ${code}` });
    return ref.id;
  }

  listContracts() {
    return this.prisma.rightsContract.findMany({
      orderBy: { createdAt: 'desc' },
      include: contractInclude,
    });
  }

  getContract(id: string) {
    return this.prisma.rightsContract.findUnique({
      where: { id },
      include: { ...contractInclude, contentRights: true },
    });
  }

  async createContract(dto: CreateRightsContractDto) {
    const holder = await this.prisma.rightsholder.findUnique({ where: { id: dto.rightsholderId } });
    if (!holder) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    if (dto.distributorId) {
      const distributor = await this.prisma.rightsholder.findUnique({ where: { id: dto.distributorId } });
      if (!distributor) throw new NotFoundException({ code: 'RIGHTSHOLDER_002', message: 'Distributeur introuvable' });
    }
    const distributorId =
      dto.distributorId?.trim() && dto.distributorId !== dto.rightsholderId
        ? dto.distributorId.trim()
        : undefined;

    const row = await this.prisma.rightsContract.create({
      data: {
        rightsholderId: dto.rightsholderId,
        distributorId,
        contractRef: dto.contractRef.trim(),
        signedAt: parseContractDate(dto.signedAt),
        startsAt: parseContractDate(dto.startsAt)!,
        endsAt: parseContractDate(dto.endsAt),
        isExclusive: dto.isExclusive ?? false,
        revenueSharePct: dto.revenueSharePct ?? null,
        notes: dto.notes?.trim() || null,
      },
      include: contractInclude,
    });
    return { ...row, message: 'Contrat créé' };
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
    const distributorId =
      dto.distributorId === undefined
        ? undefined
        : dto.distributorId?.trim() && dto.distributorId !== (dto.rightsholderId ?? existing.rightsholderId)
          ? dto.distributorId.trim()
          : null;

    const row = await this.prisma.rightsContract.update({
      where: { id },
      data: {
        ...(dto.rightsholderId !== undefined && { rightsholderId: dto.rightsholderId }),
        ...(dto.distributorId !== undefined && { distributorId }),
        ...(dto.contractRef !== undefined && { contractRef: dto.contractRef.trim() }),
        ...(dto.signedAt !== undefined && { signedAt: parseContractDate(dto.signedAt) ?? null }),
        ...(dto.startsAt !== undefined && { startsAt: parseContractDate(dto.startsAt)! }),
        ...(dto.endsAt !== undefined && { endsAt: parseContractDate(dto.endsAt) ?? null }),
        ...(dto.isExclusive !== undefined && { isExclusive: dto.isExclusive }),
        ...(dto.revenueSharePct !== undefined && { revenueSharePct: dto.revenueSharePct }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
      include: contractInclude,
    });
    return { ...row, message: 'Contrat mis à jour' };
  }

  async removeContract(id: string) {
    const existing = await this.prisma.rightsContract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_001', message: 'Contrat introuvable' });
    try {
      await this.prisma.rightsContract.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException({
          code: 'CONTRACT_IN_USE',
          message: 'Ce contrat est lié à des droits sur contenu. Supprimez-les d\'abord.',
        });
      }
      throw err;
    }
    return { id, message: 'Contrat supprimé' };
  }

  listContentRights(contentId?: string) {
    return this.prisma.contentRight.findMany({
      where: contentId ? { contentId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        content: { select: { id: true, title: true } },
        monetizationType: { select: { code: true, label: true } },
        territoryCode: { select: { code: true, label: true } },
        status: { select: { code: true, label: true } },
        contract: {
          select: {
            id: true,
            contractRef: true,
            rightsholderId: true,
            distributorId: true,
            revenueSharePct: true,
            rightsholder: { select: { id: true, displayName: true, type: { select: { code: true } } } },
            distributor: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  async createContentRight(dto: CreateContentRightDto) {
    const content = await this.prisma.content.findUnique({ where: { id: dto.contentId } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    const contract = await this.prisma.rightsContract.findUnique({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException({ code: 'RIGHTS_001', message: 'Contrat introuvable' });

    const [monetizationTypeId, territoryCodeId, statusId] = await Promise.all([
      this.resolveMonetizationTypeId(dto.monetizationType),
      this.resolveTerritoryCodeId(dto.territoryCode),
      this.resolveContentRightStatusId(dto.status),
    ]);

    const row = await this.prisma.contentRight.create({
      data: {
        contentId: dto.contentId,
        contractId: dto.contractId,
        monetizationTypeId,
        territoryCodeId,
        statusId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      include: {
        content: { select: { id: true, title: true } },
        monetizationType: { select: { code: true, label: true } },
        territoryCode: { select: { code: true, label: true } },
        status: { select: { code: true, label: true } },
        contract: {
          select: {
            id: true,
            contractRef: true,
            rightsholder: { select: { displayName: true } },
          },
        },
      },
    });
    return { ...row, message: 'Droit sur contenu créé' };
  }

  async updateContentRight(id: string, dto: UpdateContentRightDto) {
    const existing = await this.prisma.contentRight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_002', message: 'Droit contenu introuvable' });

    const [monetizationTypeId, territoryCodeId, statusId] = await Promise.all([
      dto.monetizationType ? this.resolveMonetizationTypeId(dto.monetizationType) : Promise.resolve(undefined),
      dto.territoryCode ? this.resolveTerritoryCodeId(dto.territoryCode) : Promise.resolve(undefined),
      dto.status ? this.resolveContentRightStatusId(dto.status) : Promise.resolve(undefined),
    ]);

    const row = await this.prisma.contentRight.update({
      where: { id },
      data: {
        ...(monetizationTypeId && { monetizationTypeId }),
        ...(territoryCodeId && { territoryCodeId }),
        ...(statusId && { statusId }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
      },
      include: {
        content: { select: { id: true, title: true } },
        monetizationType: { select: { code: true, label: true } },
        territoryCode: { select: { code: true, label: true } },
        status: { select: { code: true, label: true } },
        contract: { select: { id: true, contractRef: true } },
      },
    });
    return { ...row, message: 'Droit sur contenu mis à jour' };
  }

  async removeContentRight(id: string) {
    const existing = await this.prisma.contentRight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'RIGHTS_002', message: 'Droit contenu introuvable' });
    await this.prisma.contentRight.delete({ where: { id } });
    return { id, message: 'Droit sur contenu supprimé' };
  }
}
