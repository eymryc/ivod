import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/types';

@Injectable()
export class RevenueService {
  constructor(
    private prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async resolveStatementStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refRevenueStatementStatus.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  private async resolveBeneficiaryTypeId(code: string): Promise<string> {
    const ref = await this.prisma.refBeneficiaryType.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  // ── Règles ───────────────────────────────────────────────────────────────────
  async listRules() { return this.prisma.revenueRule.findMany({ orderBy: { effectiveFrom: 'desc' } }); }

  async getActiveRule(appliesToType = 'PLATFORM_DEFAULT', appliesToId?: string) {
    const now = new Date();
    return this.prisma.revenueRule.findFirst({
      where: { appliesToType, ...(appliesToId && { appliesToId }), isActive: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ── Statements ───────────────────────────────────────────────────────────────
  async listStatements(beneficiaryId?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      ...(beneficiaryId && { beneficiaryId }),
      ...(status && { status: { code: status } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.revenueStatement.findMany({
        where,
        include: {
          rule: { select: { code: true, creatorSharePct: true, platformSharePct: true } },
          content: { select: { id: true, title: true } },
          status: { select: { code: true, label: true } },
          beneficiaryType: { select: { code: true, label: true } },
        },
        orderBy: { periodStart: 'desc' },
        skip, take: limit,
      }),
      this.prisma.revenueStatement.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getStatement(statementId: string) {
    const stmt = await this.prisma.revenueStatement.findUnique({
      where: { id: statementId },
      include: {
        rule: true,
        content: { select: { id: true, title: true } },
        rightsholder: { select: { displayName: true } },
        status: { select: { code: true, label: true } },
        beneficiaryType: { select: { code: true, label: true } },
      },
    });
    if (!stmt) throw new NotFoundException({ code: 'REVENUE_001', message: 'Relevé de revenus introuvable' });
    return stmt;
  }

  // ── Calcul mensuel (appelé par cron) ─────────────────────────────────────────
  async calculateMonthlyRevenue(year: number, month: number) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    const rule = await this.getActiveRule('PLATFORM_DEFAULT');
    if (!rule) throw new BadRequestException({ code: 'REVENUE_002', message: 'Aucune règle de revenus active' });

    // Récupérer les abonnements actifs pendant la période
    const activeSubs = await this.prisma.userSubscription.findMany({
      where: { status: { code: 'ACTIVE' }, plan: { code: { not: 'FREE' } }, currentPeriodStart: { lte: periodEnd }, currentPeriodEnd: { gte: periodStart } },
      include: { plan: { select: { priceFcfaMonthly: true } } },
    });
    const grossRevenue = activeSubs.reduce((s, sub) => s + sub.plan.priceFcfaMonthly, 0);
    if (grossRevenue === 0) return { period: `${year}-${month}`, grossRevenue: 0, statements: [] };

    // Répartition par créateur selon les vues
    const views = await this.prisma.contentView.groupBy({
      by: ['contentId'],
      where: { createdAt: { gte: periodStart, lte: periodEnd } },
      _count: { contentId: true },
    });
    const totalViews = views.reduce((s, v) => s + v._count.contentId, 0);
    if (totalViews === 0) return { period: `${year}-${month}`, grossRevenue, statements: [] };

    const creatorPool = Math.floor(grossRevenue * rule.creatorSharePct / 100);
    const statements: any[] = [];

    // Résoudre les IDs des refs une seule fois
    const [beneficiaryTypeId, statusDraftId] = await Promise.all([
      this.resolveBeneficiaryTypeId('CREATOR'),
      this.resolveStatementStatusId('DRAFT'),
    ]);

    for (const view of views) {
      const content = await this.prisma.content.findUnique({
        where: { id: view.contentId },
        include: { creator: true, primaryRightsholder: { select: { id: true } } },
      });
      if (!content) continue;

      const share = Math.floor((view._count.contentId / totalViews) * creatorPool);
      if (share === 0) continue;

      const existing = await this.prisma.revenueStatement.findFirst({
        where: { contentId: view.contentId, beneficiaryTypeId, periodStart, periodEnd },
      });
      if (existing) continue;

      const stmt = await this.prisma.revenueStatement.create({
        data: {
          periodStart, periodEnd,
          beneficiaryTypeId,
          beneficiaryId: content.creator.id,
          beneficiaryRightsholderId: content.primaryRightsholder.id,
          contentId: content.id,
          ruleId: rule.id,
          grossAmount: share,
          feesAmount: 0,
          taxesAmount: 0,
          netDistributable: share,
          beneficiaryAmount: Math.floor(share * rule.creatorSharePct / 100),
          platformAmount: Math.floor(share * rule.platformSharePct / 100),
          partnerAmount: Math.floor(share * rule.partnerSharePct / 100),
          currency: 'XOF',
          statusId: statusDraftId,
        },
      });
      statements.push(stmt);
    }

    return { period: `${year}-${String(month).padStart(2, '0')}`, grossRevenue, creatorPool, statementsGenerated: statements.length };
  }

  async lockStatements(periodStart: Date, periodEnd: Date) {
    const statusLockedId = await this.resolveStatementStatusId('LOCKED');
    const statusDraftId = await this.resolveStatementStatusId('DRAFT');
    await this.prisma.revenueStatement.updateMany({
      where: { periodStart, periodEnd, statusId: statusDraftId },
      data: { statusId: statusLockedId },
    });
    return { message: 'Relevés de revenus verrouillés' };
  }

  async markPaid(statementId: string) {
    const stmt = await this.prisma.revenueStatement.findUnique({
      where: { id: statementId },
      include: { status: { select: { code: true } }, beneficiaryType: { select: { code: true } } },
    });
    if (!stmt) throw new NotFoundException({ code: 'REVENUE_001', message: 'Relevé de revenus introuvable' });
    if ((stmt as any).status.code !== 'LOCKED') throw new BadRequestException({ code: 'REVENUE_003', message: 'Seul un relevé verrouillé (LOCKED) peut être marqué comme payé' });
    const statusPaidId = await this.resolveStatementStatusId('PAID');
    const updated = await this.prisma.revenueStatement.update({
      where: { id: statementId },
      data: { statusId: statusPaidId, paidAt: new Date() },
    });

    if ((stmt as any).beneficiaryType?.code === 'CREATOR') {
      this.prisma.creator.findUnique({ where: { id: stmt.beneficiaryId }, select: { userId: true } })
        .then((creator) => {
          if (!creator) return;
          return this.notifications.dispatch({
            userId: creator.userId,
            type: NotificationType.REVENUE_PAID,
            title: 'Revenus versés',
            body: `Votre relevé de revenus (${updated.beneficiaryAmount.toLocaleString('fr-FR')} ${updated.currency}) a été payé.`,
            data: { statementId, amount: updated.beneficiaryAmount, currency: updated.currency },
          });
        })
        .catch(() => {});
    }

    return updated;
  }
}
