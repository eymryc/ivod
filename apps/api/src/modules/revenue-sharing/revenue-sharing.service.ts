import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRevenueRuleDto,
  CreateRevenueStatementDto,
  UpdateRevenueRuleDto,
  UpdateRevenueStatementDto,
} from './dto/revenue-sharing.dto';

@Injectable()
export class RevenueSharingService {
  constructor(private readonly prisma: PrismaService) {}

  private assertShareTotal(creator: number, platform: number, partner: number) {
    const total = creator + platform + partner;
    if (Math.abs(total - 100) > 0.0001) {
      throw new BadRequestException({
        code: 'REV_001',
        message: 'La somme creator/platform/partner doit être égale à 100%',
      });
    }
  }

  listRules() {
    return this.prisma.revenueRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  getRule(id: string) {
    return this.prisma.revenueRule.findUnique({ where: { id } });
  }

  createRule(dto: CreateRevenueRuleDto) {
    const partner = dto.partnerSharePct ?? 0;
    this.assertShareTotal(dto.creatorSharePct, dto.platformSharePct, partner);

    return this.prisma.revenueRule.create({
      data: {
        ...dto,
        partnerSharePct: partner,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  async updateRule(id: string, dto: UpdateRevenueRuleDto) {
    const existing = await this.prisma.revenueRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'REV_002', message: 'Règle introuvable' });

    const creator = dto.creatorSharePct ?? existing.creatorSharePct;
    const platform = dto.platformSharePct ?? existing.platformSharePct;
    const partner = dto.partnerSharePct ?? existing.partnerSharePct;
    this.assertShareTotal(creator, platform, partner);

    return this.prisma.revenueRule.update({
      where: { id },
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  async removeRule(id: string) {
    const existing = await this.prisma.revenueRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'REV_002', message: 'Règle introuvable' });
    await this.prisma.revenueRule.delete({ where: { id } });
    return { id, message: 'Règle supprimée' };
  }

  listStatements() {
    return this.prisma.revenueStatement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        content: { select: { id: true, title: true } },
        rule: { select: { id: true, code: true, name: true } },
      },
    });
  }

  getStatement(id: string) {
    return this.prisma.revenueStatement.findUnique({
      where: { id },
      include: {
        content: { select: { id: true, title: true } },
        rule: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createStatement(dto: CreateRevenueStatementDto) {
    const rule = await this.prisma.revenueRule.findUnique({ where: { id: dto.ruleId } });
    if (!rule) throw new NotFoundException({ code: 'REV_003', message: 'Règle de partage introuvable' });

    const fees = dto.feesAmount ?? 0;
    const taxes = dto.taxesAmount ?? 0;
    const net = dto.grossAmount - fees - taxes;

    const beneficiaryAmount = Math.round(net * (rule.creatorSharePct / 100));
    const platformAmount = Math.round(net * (rule.platformSharePct / 100));
    const partnerAmount = Math.round(net * (rule.partnerSharePct / 100));

    return this.prisma.revenueStatement.create({
      data: {
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        beneficiaryType: dto.beneficiaryType,
        beneficiaryId: dto.beneficiaryId,
        beneficiaryRightsholderId: dto.beneficiaryRightsholderId,
        contentId: dto.contentId,
        ruleId: dto.ruleId,
        grossAmount: dto.grossAmount,
        feesAmount: fees,
        taxesAmount: taxes,
        netDistributable: net,
        beneficiaryAmount,
        platformAmount,
        partnerAmount,
        status: dto.status,
      },
    });
  }

  async updateStatement(id: string, dto: UpdateRevenueStatementDto) {
    const existing = await this.prisma.revenueStatement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'REV_004', message: 'Statement introuvable' });
    return this.prisma.revenueStatement.update({ where: { id }, data: dto });
  }

  async removeStatement(id: string) {
    const existing = await this.prisma.revenueStatement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'REV_004', message: 'Statement introuvable' });
    await this.prisma.revenueStatement.delete({ where: { id } });
    return { id, message: 'Statement supprimé' };
  }
}
