import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@/common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private providerFactory: PaymentProviderFactory,
  ) {}

  private async resolveStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refRefundStatus.findUniqueOrThrow({
      where: { code },
      select: { id: true },
    });
    return ref.id;
  }

  async request(userId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: {
        status: { select: { code: true } },
        provider: { select: { code: true } },
        user: { select: { email: true, firstName: true } },
      },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    if (payment.status.code !== 'COMPLETED') {
      throw new BadRequestException({
        code: 'REFUND_001',
        message: 'Seul un paiement complété peut être remboursé',
      });
    }
    const existing = await this.prisma.refund.findFirst({
      where: {
        paymentId,
        status: { code: { in: ['REQUESTED', 'APPROVED', 'PROCESSED'] } },
      },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'REFUND_002',
        message: 'Un remboursement est déjà en cours ou traité',
      });
    }

    const statusId = await this.resolveStatusId('REQUESTED');
    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        currency: payment.currency,
        reason,
        statusId,
      },
      include: { status: { select: { code: true, label: true } } },
    });

    if (payment.user?.email) {
      this.mail
        .sendRefundRequestedEmail({
          to: payment.user.email,
          firstName: payment.user.firstName ?? payment.user.email,
          amount: Number(payment.amount),
          currency: payment.currency,
          refundId: refund.id,
          reason,
        })
        .catch((err: Error) => this.logger.error('Email remboursement demandé', err.message));
    }

    return refund;
  }

  /**
   * Admin — remboursement immédiat via Paystack (total).
   */
  async adminRefundPayment(paymentId: string, opts?: { reason?: string; merchantNote?: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true } },
        provider: { select: { code: true, label: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        userSubscription: { select: { id: true } },
        refunds: { include: { status: { select: { code: true } } } },
      },
    });

    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });
    }
    if (payment.status.code === 'REFUNDED') {
      throw new BadRequestException({ code: 'REFUND_004', message: 'Paiement déjà remboursé' });
    }
    if (payment.status.code !== 'COMPLETED') {
      throw new BadRequestException({
        code: 'REFUND_001',
        message: 'Seul un paiement complété peut être remboursé',
      });
    }
    if (payment.provider.code !== 'PAYSTACK') {
      throw new BadRequestException({
        code: 'REFUND_005',
        message: 'Remboursement automatique disponible uniquement pour Paystack',
      });
    }

    const activeRefund = payment.refunds.find((r) =>
      ['REQUESTED', 'APPROVED', 'PROCESSED'].includes(r.status.code),
    );
    if (activeRefund) {
      throw new BadRequestException({
        code: 'REFUND_002',
        message: 'Un remboursement existe déjà pour ce paiement',
      });
    }

    const approvedStatusId = await this.resolveStatusId('APPROVED');
    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        currency: payment.currency,
        reason: opts?.reason ?? 'Remboursement administrateur iVOD',
        statusId: approvedStatusId,
      },
    });

    return this.executePaystackRefund(payment, refund.id, opts?.reason, opts?.merchantNote);
  }

  private async executePaystackRefund(
    payment: {
      id: string;
      amount: number;
      currency: string;
      transactionId: string | null;
      status: { code: string };
      provider: { code: string };
    },
    refundId: string,
    customerNote?: string,
    merchantNote?: string,
  ) {
    if (payment.status.code !== 'COMPLETED') {
      throw new BadRequestException({ code: 'REFUND_001', message: 'Paiement non remboursable' });
    }
    if (payment.provider.code !== 'PAYSTACK') {
      throw new BadRequestException({ code: 'REFUND_005', message: 'Paystack requis' });
    }

    const approvedStatusId = await this.resolveStatusId('APPROVED');
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { statusId: approvedStatusId },
    });

    const transactionRef = payment.transactionId ?? payment.id;
    const paystack = this.providerFactory.getPaystack();
    const gateway = await paystack.createRefund({
      transaction: transactionRef,
      amount: payment.amount,
      currency: payment.currency,
      customerNote: customerNote ?? 'Remboursement iVOD',
      merchantNote: merchantNote ?? `Refund ${refundId}`,
    });

    if (gateway.status === 'failed' || !gateway.id) {
      const rejectedId = await this.resolveStatusId('REJECTED');
      await this.prisma.refund.update({
        where: { id: refundId },
        data: { statusId: rejectedId, processedAt: new Date() },
      });
      throw new BadRequestException({
        code: 'REFUND_006',
        message: gateway.message ?? 'Échec remboursement Paystack',
      });
    }

    await this.prisma.refund.update({
      where: { id: refundId },
      data: { gatewayRefundId: gateway.id },
    });

    if (process.env.NODE_ENV !== 'production' && !process.env.PAYSTACK_SECRET_KEY) {
      await this.finalizeRefund(payment.id, refundId, { gateway, simulated: true });
      return {
        refundId,
        gatewayRefundId: gateway.id,
        status: 'PROCESSED',
        message: 'Remboursement simulé (dev)',
      };
    }

    if (gateway.status === 'processed') {
      await this.finalizeRefund(payment.id, refundId, { gateway });
      return {
        refundId,
        gatewayRefundId: gateway.id,
        status: 'PROCESSED',
        message: 'Remboursement traité',
      };
    }

    return {
      refundId,
      gatewayRefundId: gateway.id,
      status: 'APPROVED',
      message: 'Remboursement initié — confirmation via webhook Paystack',
    };
  }

  async handlePaystackRefundWebhook(body: Record<string, unknown>) {
    const event = body.event as string | undefined;
    const data = (body.data ?? {}) as Record<string, unknown>;
    const transaction = (data.transaction ?? {}) as Record<string, unknown>;
    const paymentRef = (transaction.reference ?? data.transaction_reference ?? data.reference) as
      | string
      | undefined;
    const gatewayRefundId = data.id != null ? String(data.id) : undefined;

    if (!paymentRef && !gatewayRefundId) {
      this.logger.warn('Webhook remboursement: référence introuvable', body);
      return { received: true };
    }

    let refund = gatewayRefundId
      ? await this.prisma.refund.findFirst({
          where: { gatewayRefundId },
          include: { payment: { select: { id: true } } },
        })
      : null;

    if (!refund && paymentRef) {
      refund = await this.prisma.refund.findFirst({
        where: { paymentId: paymentRef },
        orderBy: { createdAt: 'desc' },
        include: { payment: { select: { id: true } } },
      });
    }

    if (!refund) {
      this.logger.warn(`Webhook remboursement: refund introuvable ref=${paymentRef}`);
      return { received: true };
    }

    if (event === 'refund.processed' || (data.status as string) === 'processed') {
      await this.finalizeRefund(refund.paymentId, refund.id, body);
    } else if (event === 'refund.failed' || (data.status as string) === 'failed') {
      const rejectedId = await this.resolveStatusId('REJECTED');
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { statusId: rejectedId, processedAt: new Date() },
      });
      if (refund.payment?.id) {
        const payment = await this.prisma.payment.findUnique({
          where: { id: refund.paymentId },
          include: { user: { select: { id: true, email: true, firstName: true } } },
        });
        if (payment?.user?.email) {
          this.mail
            .sendRefundProcessedEmail({
              to: payment.user.email,
              firstName: payment.user.firstName ?? payment.user.email,
              amount: Number(refund.amount),
              currency: refund.currency,
              action: 'reject',
            })
            .catch((err: Error) => this.logger.error('Email remboursement échoué', err.message));
        }
      }
    }

    return { received: true };
  }

  private async finalizeRefund(
    paymentId: string,
    refundId: string,
    gatewayBody: Record<string, unknown>,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        status: { select: { code: true } },
        user: { select: { id: true, email: true, firstName: true } },
        userSubscription: { select: { id: true } },
      },
    });
    if (!payment || payment.status.code === 'REFUNDED') return;

    const [processedStatusId, refundedPaymentStatusId, cancelledSubStatus] = await Promise.all([
      this.resolveStatusId('PROCESSED'),
      this.prisma.refPaymentStatus.findUniqueOrThrow({ where: { code: 'REFUNDED' }, select: { id: true } }),
      this.prisma.refSubscriptionStatus.findUnique({ where: { code: 'CANCELLED' }, select: { id: true } }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { statusId: processedStatusId, processedAt: new Date() },
      });
      await tx.payment.update({
        where: { id: paymentId },
        data: { statusId: refundedPaymentStatusId.id },
      });
      if (payment.userSubscriptionId && cancelledSubStatus) {
        await tx.userSubscription.update({
          where: { id: payment.userSubscriptionId },
          data: { statusId: cancelledSubStatus.id, cancelAtPeriodEnd: false },
        });
      }
    });

    await this.notifications
      .dispatch({
        userId: payment.user.id,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Remboursement effectué',
        body: `Votre paiement de ${payment.amount} ${payment.currency} a été remboursé.`,
        data: { paymentId, amount: Number(payment.amount) },
      })
      .catch((err: Error) => this.logger.error('Notification remboursement', err.message));

    if (payment.user.email) {
      this.mail
        .sendRefundProcessedEmail({
          to: payment.user.email,
          firstName: payment.user.firstName ?? payment.user.email,
          amount: Number(payment.amount),
          currency: payment.currency,
          action: 'approve',
        })
        .catch((err: Error) => this.logger.error('Email remboursement traité', err.message));
    }

    this.logger.log(`Remboursement finalisé payment=${paymentId} refund=${refundId}`);
  }

  async list(userId: string) {
    return this.prisma.refund.findMany({
      where: { payment: { userId } },
      include: {
        payment: { select: { amount: true, currency: true, createdAt: true } },
        status: { select: { code: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(params: { page?: number; limit?: number; status?: string }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 30, 100);
    const skip = (page - 1) * limit;
    const where = params.status ? { status: { code: params.status } } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        include: {
          status: { select: { code: true, label: true } },
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async processAdmin(refundId: string, action: 'approve' | 'reject') {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        status: { select: { code: true } },
        payment: {
          include: {
            status: { select: { code: true } },
            provider: { select: { code: true } },
            user: { select: { id: true, email: true, firstName: true } },
            userSubscription: { select: { id: true } },
          },
        },
      },
    });
    if (!refund) throw new NotFoundException({ code: 'REFUND_003', message: 'Remboursement introuvable' });

    if (action === 'approve') {
      if (refund.status.code !== 'REQUESTED') {
        throw new BadRequestException({ code: 'REFUND_007', message: 'Demande déjà traitée' });
      }
      return this.executePaystackRefund(refund.payment, refund.id, refund.reason ?? undefined);
    }

    const statusId = await this.resolveStatusId('REJECTED');
    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: { statusId, processedAt: new Date() },
      include: { status: { select: { code: true, label: true } } },
    });

    const userEmail = refund.payment?.user?.email;
    if (userEmail) {
      this.mail
        .sendRefundProcessedEmail({
          to: userEmail,
          firstName: refund.payment.user?.firstName ?? userEmail,
          amount: Number(refund.amount),
          currency: refund.currency,
          action: 'reject',
        })
        .catch((err: Error) => this.logger.error('Email remboursement traité', err.message));
    }
    return updated;
  }
}
