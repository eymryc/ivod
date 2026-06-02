import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { NotificationType } from '@/common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundsService } from '../refunds/refunds.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private providerFactory: PaymentProviderFactory,
    private config: ConfigService,
    private notifications: NotificationsService,
    private mail: MailService,
    @Inject(forwardRef(() => RefundsService))
    private refundsService: RefundsService,
  ) {}

  private apiBaseUrl(): string {
    const raw =
      this.config.get<string>('API_PUBLIC_URL') ??
      this.config.get<string>('API_URL') ??
      'http://localhost:3000/api/v1';
    return raw.replace(/\/$/, '');
  }

  private frontendCallbackUrl(reference: string): string {
    const front = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001').replace(/\/$/, '');
    return `${front}/payment/callback?reference=${encodeURIComponent(reference)}`;
  }

  private webhookUrl(providerCode: string): string {
    return `${this.apiBaseUrl()}/payments/webhook/${providerCode.toLowerCase()}`;
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where: { userId },
        include: {
          status: { select: { code: true, label: true } },
          provider: { select: { code: true, label: true } },
          userSubscription: { include: { plan: { select: { code: true, label: true } } } },
          content: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  /** Vérifie Paystack et finalise le paiement si succès (callback sans webhook). */
  async syncFromGateway(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: {
        status: { select: { code: true } },
        provider: { select: { code: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    }
    if (payment.status.code === 'COMPLETED' || payment.status.code === 'FAILED') {
      return this.getOne(userId, paymentId);
    }
    if (payment.provider.code !== 'PAYSTACK') {
      return this.getOne(userId, paymentId);
    }
    const verification = await this.providerFactory.getProvider('PAYSTACK').verifyPayment(payment.id);
    if (verification.status === 'COMPLETED') {
      await this.completePayment(payment.id, { source: 'sync' }, verification.amount);
    } else if (verification.status === 'FAILED') {
      await this.failPayment(payment.id, { source: 'sync' });
    }
    return this.getOne(userId, paymentId);
  }

  async getOne(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: {
        status: { select: { code: true, label: true } },
        provider: { select: { code: true, label: true } },
        userSubscription: { include: { plan: { select: { code: true, label: true } } } },
        content: { select: { id: true, title: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, reference: true, type: true, amount: true, status: true, createdAt: true },
        },
        invoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
      },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    return payment;
  }

  /** Admin — liste tous les paiements */
  async adminList(params: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 30, 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = { code: params.status };
    }
    if (params.provider) {
      where.provider = { code: params.provider };
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { transactionId: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { status: _statusFilter, ...whereWithoutStatus } = where;
    const completedWhere = {
      ...whereWithoutStatus,
      status: { code: 'COMPLETED' },
    };

    const [items, total, byStatus, byProvider, revenueAgg] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          status: { select: { code: true, label: true } },
          provider: { select: { code: true, label: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          userSubscription: { include: { plan: { select: { code: true, label: true } } } },
          content: { select: { id: true, title: true } },
          refunds: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { status: { select: { code: true, label: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({
        by: ['statusId'],
        where,
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { statusId: 'asc' },
      }),
      this.prisma.payment.groupBy({
        by: ['providerId'],
        where,
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { providerId: 'asc' },
      }),
      this.prisma.payment.aggregate({
        where: completedWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const statuses = await this.prisma.refPaymentStatus.findMany({ select: { id: true, code: true, label: true } });
    const providers = await this.prisma.refPaymentProvider.findMany({ select: { id: true, code: true, label: true } });

    const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));
    const providerMap = Object.fromEntries(providers.map((p) => [p.id, p]));

    return {
      items,
      total,
      page,
      limit,
      stats: {
        completedRevenue: Number(revenueAgg._sum.amount ?? 0),
        completedCount: revenueAgg._count.id,
        byStatus: byStatus.map((row) => ({
          status: statusMap[row.statusId]?.code ?? 'UNKNOWN',
          label: statusMap[row.statusId]?.label,
          count: (row._count as { id?: number })?.id ?? 0,
          amount: Number(row._sum?.amount ?? 0),
        })),
        byProvider: byProvider.map((row) => ({
          provider: providerMap[row.providerId]?.code ?? 'UNKNOWN',
          label: providerMap[row.providerId]?.label,
          count: (row._count as { id?: number })?.id ?? 0,
          amount: Number(row._sum?.amount ?? 0),
        })),
      },
    };
  }

  async adminGetOne(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true, label: true } },
        provider: { select: { code: true, label: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        userSubscription: { include: { plan: true, status: true } },
        content: { select: { id: true, title: true, slug: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        invoice: true,
        refunds: true,
      },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    return payment;
  }

  async devForceComplete(paymentId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException({ code: 'PAYMENT_015', message: 'Simulation désactivée en production' });
    }
    if (!this.allowPaymentSimulation()) {
      throw new BadRequestException({
        code: 'PAYMENT_017',
        message: 'Simulation désactivée. Définissez ALLOW_PAYMENT_SIMULATION=true ou configurez Paystack.',
      });
    }
    await this.completePayment(paymentId, { devSimulate: true });
    return { ok: true, paymentId, status: 'COMPLETED' };
  }

  isPaystackConfigured(): boolean {
    return this.providerFactory.getPaystack().isConfigured();
  }

  allowPaymentSimulation(): boolean {
    return process.env.ALLOW_PAYMENT_SIMULATION === 'true' && process.env.NODE_ENV !== 'production';
  }

  /** Vrai seulement si Paystack (ou autre gateway) confirme un encaissement réel — pas une simulation dev. */
  async isGenuineCompletedPayment(paymentId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true } },
        provider: { select: { code: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!payment || payment.status.code !== 'COMPLETED') return false;

    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    if (meta.devSimulate === true) return false;

    const gw = payment.transactions[0]?.gatewayResponse as Record<string, unknown> | null;
    if (gw?.devSimulate === true) return false;

    if (payment.provider.code === 'PAYSTACK') {
      if (!this.isPaystackConfigured()) return false;
      const verification = await this.providerFactory.getProvider('PAYSTACK').verifyPayment(payment.id);
      return verification.status === 'COMPLETED';
    }

    return true;
  }

  async getPaystackConfig() {
    const paystack = this.providerFactory.getPaystack();
    const configured = paystack.isConfigured();
    const rawSecret = this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
    return {
      publicKey: paystack.getPublicKey(),
      currency: 'XOF',
      configured,
      secretKeyInvalid: Boolean(rawSecret.trim()) && !configured,
      simulationAllowed: this.allowPaymentSimulation(),
      simulationMode: !configured && this.allowPaymentSimulation(),
    };
  }

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    if (
      dto.providerCode === 'PAYSTACK' &&
      !this.isPaystackConfigured() &&
      !this.allowPaymentSimulation()
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_016',
        message:
          'Paystack n’est pas configuré. Définissez PAYSTACK_SECRET_KEY et PAYSTACK_PUBLIC_KEY dans apps/api/.env (clés test ou live du dashboard Paystack).',
      });
    }

    if (dto.providerCode === 'PAYSTACK' && !dto.email) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (!user?.email) {
        throw new BadRequestException({
          code: 'PAYMENT_012',
          message: 'Email requis pour payer avec Paystack',
        });
      }
      dto.email = user.email;
    }

    const providerRef = await this.prisma.refPaymentProvider.findUnique({
      where: { code: dto.providerCode },
    });
    if (!providerRef) {
      throw new NotFoundException({
        code: 'PAYMENT_011',
        message: `Fournisseur ${dto.providerCode} non trouvé`,
      });
    }

    const pendingStatus = await this.prisma.refPaymentStatus.findUniqueOrThrow({
      where: { code: 'PENDING' },
      select: { id: true },
    });

    let description = 'Paiement iVOD';
    if (dto.planCode) {
      description = `Abonnement iVOD ${dto.planCode}`;
    } else if (dto.contentId) {
      const content = await this.prisma.content.findUnique({
        where: { id: dto.contentId },
        select: { title: true },
      });
      description = `Achat ${content?.title ?? dto.contentId}`;
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: 'XOF',
        statusId: pendingStatus.id,
        providerId: providerRef.id,
        phoneNumber: dto.phoneNumber ?? null,
        userSubscriptionId: dto.userSubscriptionId ?? null,
        contentId: dto.contentId ?? null,
        metadata: {
          providerCode: dto.providerCode,
          description,
          email: dto.email,
          planCode: dto.planCode,
        },
      },
    });

    const provider = this.providerFactory.getProvider(dto.providerCode);
    const callbackUrl =
      dto.providerCode === 'PAYSTACK'
        ? this.frontendCallbackUrl(payment.id)
        : this.webhookUrl(dto.providerCode);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const result = await provider.initiatePayment({
      amount: dto.amount,
      currency: 'XOF',
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      customerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      reference: payment.id,
      description,
      callbackUrl,
    });

    if (result.status === 'FAILED') {
      const failedStatus = await this.prisma.refPaymentStatus.findUniqueOrThrow({
        where: { code: 'FAILED' },
        select: { id: true },
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { statusId: failedStatus.id },
      });
      throw new BadRequestException({
        code: 'PAYMENT_013',
        message: result.message ?? 'Échec initialisation paiement',
      });
    }

    if (result.transactionId) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: result.transactionId },
      });
    }

    const [txTypeDebit, txStatusPending] = await Promise.all([
      this.prisma.refTransactionType.findUniqueOrThrow({ where: { code: 'DEBIT' }, select: { id: true } }),
      this.prisma.refPaymentStatus.findUniqueOrThrow({ where: { code: 'PENDING' }, select: { id: true } }),
    ]);
    await this.prisma.transaction.create({
      data: {
        paymentId: payment.id,
        reference: `TXN-${payment.id}-${Date.now()}`,
        typeId: txTypeDebit.id,
        amount: dto.amount,
        currency: 'XOF',
        statusId: txStatusPending.id,
        gatewayResponse: result as object,
      },
    });

    const simulationMode =
      dto.providerCode === 'PAYSTACK' && !this.isPaystackConfigured() && this.allowPaymentSimulation();

    return {
      paymentId: payment.id,
      id: payment.id,
      transactionId: result.transactionId,
      status: result.status,
      redirectUrl: result.redirectUrl,
      message: result.message,
      reference: payment.id,
      simulationMode,
    };
  }

  /** Relance Paystack sur un paiement PENDING existant (sans créer un nouveau payment). */
  async resumeCheckout(
    userId: string,
    paymentId: string,
    opts?: { email?: string; phoneNumber?: string },
  ) {
    if (
      !this.isPaystackConfigured() &&
      !this.allowPaymentSimulation()
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_016',
        message:
          'Paystack n’est pas configuré. Définissez PAYSTACK_SECRET_KEY et PAYSTACK_PUBLIC_KEY dans apps/api/.env.',
      });
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: {
        status: { select: { code: true } },
        provider: { select: { code: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    }
    if (payment.status.code === 'COMPLETED') {
      return {
        paymentId: payment.id,
        id: payment.id,
        status: 'COMPLETED',
        redirectUrl: undefined,
        reference: payment.id,
        alreadyCompleted: true,
        simulationMode: false,
      };
    }
    if (payment.status.code !== 'PENDING') {
      throw new BadRequestException({
        code: 'PAYMENT_014',
        message: 'Ce paiement ne peut plus être relancé',
      });
    }

    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    const planCode = meta.planCode as string | undefined;
    const description =
      typeof meta.description === 'string'
        ? meta.description
        : planCode
          ? `Abonnement iVOD ${planCode}`
          : 'Paiement iVOD';

    let email = opts?.email ?? (meta.email as string | undefined);
    if (!email) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (!user?.email) {
        throw new BadRequestException({
          code: 'PAYMENT_012',
          message: 'Email requis pour payer avec Paystack',
        });
      }
      email = user.email;
    }

    const provider = this.providerFactory.getProvider(payment.provider.code);
    const callbackUrl =
      payment.provider.code === 'PAYSTACK'
        ? this.frontendCallbackUrl(payment.id)
        : this.webhookUrl(payment.provider.code);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const result = await provider.initiatePayment({
      amount: payment.amount,
      currency: payment.currency,
      phoneNumber: opts?.phoneNumber ?? payment.phoneNumber ?? undefined,
      email,
      customerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      reference: payment.id,
      description,
      callbackUrl,
    });

    if (result.status === 'FAILED') {
      throw new BadRequestException({
        code: 'PAYMENT_013',
        message: result.message ?? 'Échec initialisation paiement',
      });
    }

    if (result.transactionId) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: result.transactionId },
      });
    }

    const simulationMode =
      payment.provider.code === 'PAYSTACK' && !this.isPaystackConfigured() && this.allowPaymentSimulation();

    return {
      paymentId: payment.id,
      id: payment.id,
      transactionId: result.transactionId,
      status: result.status,
      redirectUrl: result.redirectUrl,
      message: result.message,
      reference: payment.id,
      simulationMode,
    };
  }

  verifyPaystackSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
    if (!secret || !signature) return false;
    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handlePaystackWebhook(rawBody: string, signature: string | undefined, body: Record<string, unknown>) {
    if (!this.verifyPaystackSignature(rawBody, signature)) {
      this.logger.warn('Webhook Paystack: signature invalide');
      throw new UnauthorizedException({ code: 'PAYMENT_014', message: 'Signature webhook invalide' });
    }

    const event = body.event as string | undefined;

    if (event?.startsWith('refund.')) {
      return this.refundsService.handlePaystackRefundWebhook(body);
    }

    const data = (body.data ?? {}) as Record<string, unknown>;
    const reference = (data.reference ?? data.client_reference) as string | undefined;

    if (!reference) {
      this.logger.warn('Webhook Paystack: référence manquante', body);
      return { received: true };
    }

    if (event === 'charge.success' || event === 'transfer.success') {
      await this.completePaymentByReference(reference, body);
    } else if (event === 'charge.failed') {
      await this.failPaymentByReference(reference, body);
    }

    return { received: true };
  }

  async handleWebhook(providerCode: string, body: Record<string, unknown>): Promise<void> {
    const reference = (body.reference ?? body.order_id ?? body.client_reference) as string | undefined;
    if (!reference) {
      this.logger.warn(`Webhook ${providerCode}: aucune référence`, body);
      return;
    }

    const payment = await this.findPaymentByReference(reference);
    if (!payment) {
      this.logger.warn(`Webhook ${providerCode}: paiement introuvable reference=${reference}`);
      return;
    }

    if (payment.status.code === 'COMPLETED') return;

    const provider = this.providerFactory.getProvider(providerCode.toUpperCase());
    const transactionId = payment.transactionId ?? reference;
    const verification = await provider.verifyPayment(transactionId);

    if (verification.status === 'COMPLETED') {
      await this.completePayment(payment.id, body, verification.amount);
    } else if (verification.status === 'FAILED') {
      await this.failPayment(payment.id, body);
    }
  }

  private async findPaymentByReference(reference: string) {
    return this.prisma.payment.findFirst({
      where: { OR: [{ id: reference }, { transactionId: reference }] },
      include: {
        status: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        userSubscription: { select: { id: true, planId: true } },
      },
    });
  }

  private async completePaymentByReference(reference: string, gatewayBody: Record<string, unknown>) {
    const payment = await this.findPaymentByReference(reference);
    if (!payment || payment.status.code === 'COMPLETED') return;
    const verification = await this.providerFactory.getProvider('PAYSTACK').verifyPayment(reference);
    if (verification.status === 'COMPLETED') {
      await this.completePayment(payment.id, gatewayBody, verification.amount);
    }
  }

  private async failPaymentByReference(reference: string, gatewayBody: Record<string, unknown>) {
    const payment = await this.findPaymentByReference(reference);
    if (!payment || payment.status.code === 'COMPLETED') return;
    await this.failPayment(payment.id, gatewayBody);
  }

  private async completePayment(paymentId: string, gatewayBody: Record<string, unknown>, verifiedAmount?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        userSubscription: { select: { id: true, planId: true } },
      },
    });
    if (!payment) return;
    if (payment.status.code === 'COMPLETED') return;

    const invoiceNumber = `INV-${Date.now()}-${payment.id.slice(-6).toUpperCase()}`;

    // Toutes les opérations DB doivent réussir ou échouer ensemble pour éviter une
    // incohérence financière (paiement COMPLETED sans facture / sans abonnement activé).
    const txResult = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const completedStatus = await tx.refPaymentStatus.findUniqueOrThrow({
        where: { code: 'COMPLETED' },
        select: { id: true },
      });

      const devSimulate = gatewayBody.devSimulate === true;
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { code: { not: 'COMPLETED' } } },
        data: {
          statusId: completedStatus.id,
          paidAt: new Date(),
          metadata: {
            ...((payment.metadata as Record<string, unknown>) ?? {}),
            ...(devSimulate ? { devSimulate: true } : {}),
          },
        },
      });
      if (count === 0) return { applied: false as const };

      const [txTypeCredit, txStatusCompleted] = await Promise.all([
        tx.refTransactionType.findUniqueOrThrow({ where: { code: 'CREDIT' }, select: { id: true } }),
        tx.refPaymentStatus.findUniqueOrThrow({ where: { code: 'COMPLETED' }, select: { id: true } }),
      ]);
      await tx.transaction.create({
        data: {
          paymentId: payment.id,
          reference: `TXN-CREDIT-${payment.id}-${Date.now()}`,
          typeId: txTypeCredit.id,
          amount: verifiedAmount ?? payment.amount,
          currency: payment.currency,
          statusId: txStatusCompleted.id,
          gatewayResponse: gatewayBody as object,
        },
      });

      let planLabel = 'Abonnement iVOD';
      let periodEnd: Date | undefined;

      if (payment.userSubscriptionId) {
        const activeStatus = await tx.refSubscriptionStatus.findUnique({
          where: { code: 'ACTIVE' },
          select: { id: true },
        });
        const sub = await tx.userSubscription.findUnique({
          where: { id: payment.userSubscriptionId },
          include: { plan: true },
        });
        if (activeStatus && sub) {
          const now = new Date();
          const billingDays = (sub.plan as { billingDays?: number }).billingDays;
          const days = billingDays && billingDays > 0 ? billingDays : 30;
          const computedPeriodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
          await tx.userSubscription.update({
            where: { id: payment.userSubscriptionId },
            data: {
              statusId: activeStatus.id,
              currentPeriodStart: now,
              currentPeriodEnd: computedPeriodEnd,
            },
          });
          planLabel = sub.plan.label;
          periodEnd = computedPeriodEnd;
        }
      }

      const invoiceStatusPaid = await tx.refInvoiceStatus.findUniqueOrThrow({
        where: { code: 'PAID' },
        select: { id: true },
      });
      await tx.invoice.upsert({
        where: { paymentId: payment.id },
        create: {
          userId: payment.userId,
          paymentId: payment.id,
          invoiceNumber,
          subtotal: payment.amount,
          total: payment.amount,
          currency: payment.currency,
          statusId: invoiceStatusPaid.id,
        },
        update: {
          statusId: invoiceStatusPaid.id,
          subtotal: payment.amount,
          total: payment.amount,
        },
      });

      return { applied: true as const, planLabel, periodEnd };
    });

    if (!txResult.applied) return;

    // Notifications & mails hors transaction : un échec ici ne doit pas rollback le paiement.
    await this.notifications
      .dispatch({
        userId: payment.userId,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Paiement confirmé',
        body: `Votre paiement de ${payment.amount} ${payment.currency} a été confirmé.`,
        data: {
          paymentId: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
        },
      })
      .catch((err: Error) => this.logger.error('Notification paiement confirmé', err.message));

    if (payment.user?.email) {
      this.mail
        .sendPaymentConfirmedEmail({
          to: payment.user.email,
          firstName: payment.user.firstName ?? payment.user.email,
          amount: Number(payment.amount),
          currency: payment.currency,
          planLabel: txResult.planLabel,
          invoiceNumber,
          periodEnd: txResult.periodEnd,
        })
        .catch((err: Error) => this.logger.error('Email paiement confirmé', err.message));
    }
  }

  private async failPayment(paymentId: string, gatewayBody: Record<string, unknown>) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!payment || payment.status.code === 'FAILED' || payment.status.code === 'COMPLETED') return;

    const failedStatus = await this.prisma.refPaymentStatus.findUniqueOrThrow({
      where: { code: 'FAILED' },
      select: { id: true },
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { statusId: failedStatus.id },
    });

    const [txTypeDebitFailed, txStatusFailed] = await Promise.all([
      this.prisma.refTransactionType.findUniqueOrThrow({ where: { code: 'DEBIT' }, select: { id: true } }),
      this.prisma.refPaymentStatus.findUniqueOrThrow({ where: { code: 'FAILED' }, select: { id: true } }),
    ]);
    await this.prisma.transaction.create({
      data: {
        paymentId: payment.id,
        reference: `TXN-FAILED-${payment.id}-${Date.now()}`,
        typeId: txTypeDebitFailed.id,
        amount: payment.amount,
        currency: payment.currency,
        statusId: txStatusFailed.id,
        gatewayResponse: gatewayBody as object,
      },
    });

    await this.notifications
      .dispatch({
        userId: payment.userId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Paiement échoué',
        body: `Votre paiement de ${payment.amount} ${payment.currency} n'a pas pu être validé.`,
        data: { paymentId: payment.id, amount: Number(payment.amount), currency: payment.currency },
      })
      .catch((err: Error) => this.logger.error('Notification paiement échoué', err.message));

    if (payment.user?.email) {
      this.mail
        .sendPaymentFailedEmail({
          to: payment.user.email,
          firstName: payment.user.firstName ?? payment.user.email,
          amount: Number(payment.amount),
          currency: payment.currency,
        })
        .catch((err: Error) => this.logger.error('Email paiement échoué', err.message));
    }
  }
}
