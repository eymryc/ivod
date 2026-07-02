import { Injectable, BadRequestException, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto, CancelSubscriptionDto } from './dto/subscriptions.dto';
import { NotificationType } from '@/common/types';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { isPaidSvodPlan } from '../../common/constants/plans';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private paymentsService: PaymentsService,
  ) {}

  // ── Helpers référentiels ────────────────────────────────────────────────────

  private async requirePlan(code: string) {
    const plan = await this.prisma.refUserPlan.findUnique({ where: { code } });
    if (!plan) throw new NotFoundException({ code: 'PLAN_001', message: `Plan inconnu: ${code}` });
    return plan;
  }

  private async requireProvider(code: string) {
    const provider = await this.prisma.refPaymentProvider.findUnique({ where: { code } });
    if (!provider || !provider.isActive) throw new NotFoundException({ code: 'PROVIDER_001', message: `Fournisseur inconnu ou inactif: ${code}` });
    return provider;
  }

  private async requireStatus(code: string) {
    const status = await this.prisma.refSubscriptionStatus.findUnique({ where: { code } });
    if (!status) throw new NotFoundException({ code: 'STATUS_001', message: `Statut inconnu: ${code}` });
    return status;
  }

  private async requirePaymentStatus(code: string) {
    const status = await this.prisma.refPaymentStatus.findUnique({ where: { code } });
    if (!status) throw new NotFoundException({ code: 'STATUS_001', message: `Statut paiement inconnu: ${code}` });
    return status;
  }

  // ── Abonnement actif ────────────────────────────────────────────────────────

  async getActive(userId: string) {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { currentPeriodEnd: 'desc' },
      include: {
        plan: {
          select: {
            code: true,
            label: true,
            tagline: true,
            priceFcfaMonthly: true,
            billingDays: true,
            maxScreens: true,
            videoQuality: true,
            hasAds: true,
            hasExclusiveAccess: true,
            maxOfflineDownloads: true,
          },
        },
        status: { select: { code: true, label: true } },
        provider: { select: { code: true, label: true } },
      },
    });

    if (!sub) return { hasActiveSubscription: false, plan: 'FREE' };

    return {
      hasActiveSubscription: true,
      id: sub.id,
      plan: sub.plan.code,
      planDetails: sub.plan,
      status: sub.status.code,
      provider: sub.provider.code,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      daysRemaining: Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86400000)),
    };
  }

  async getHistory(userId: string) {
    const subs = await this.prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true, label: true, priceFcfaMonthly: true } },
        status: { select: { code: true } },
        provider: { select: { code: true, label: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { amount: true, currency: true, paidAt: true, status: { select: { code: true } } },
        },
      },
    });
    return subs;
  }

  // ── Créer un abonnement ─────────────────────────────────────────────────────

  async subscribe(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.requirePlan(dto.planCode);

    const existingActive = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' }, plan: { code: { not: 'FREE' } } },
      include: { plan: { select: { code: true, label: true } } },
    });
    if (existingActive) {
      if (existingActive.plan.code === plan.code) {
        return {
          message: 'Abonnement déjà actif',
          subscriptionId: existingActive.id,
          plan: plan.code,
          status: 'ACTIVE',
          paymentPending: false,
          alreadyActive: true,
        };
      }
      throw new ConflictException({
        code: 'SUB_001',
        message: "Un abonnement actif existe déjà. Annulez-le avant d'en créer un nouveau.",
      });
    }

    const pendingTrial = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'TRIAL' }, planId: plan.id },
      include: {
        plan: { select: { code: true, label: true, priceFcfaMonthly: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { status: { select: { code: true } } },
        },
      },
    });

    if (pendingTrial?.payments?.length) {
      const completedPay = pendingTrial.payments.find((p) => p.status.code === 'COMPLETED');
      if (completedPay) {
        const genuinelyPaid = await this.paymentsService.isGenuineCompletedPayment(completedPay.id);
        if (genuinelyPaid) {
          const activeStatus = await this.requireStatus('ACTIVE');
          const now = new Date();
          const days = plan.billingDays > 0 ? plan.billingDays : 30;
          const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
          await this.prisma.userSubscription.update({
            where: { id: pendingTrial.id },
            data: {
              statusId: activeStatus.id,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
          return {
            message: 'Paiement déjà confirmé — abonnement activé',
            subscriptionId: pendingTrial.id,
            plan: plan.code,
            status: 'ACTIVE',
            paymentPending: false,
            alreadyCompleted: true,
          };
        }
      }

      const pendingPay = pendingTrial.payments.find((p) => p.status.code === 'PENDING');
      if (pendingPay) {
        const checkout = await this.paymentsService.resumeCheckout(userId, pendingPay.id, {
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          callbackUrl: dto.callbackUrl,
        });
        if (checkout.alreadyCompleted) {
          const activeStatus = await this.requireStatus('ACTIVE');
          const now = new Date();
          const days = plan.billingDays > 0 ? plan.billingDays : 30;
          const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
          await this.prisma.userSubscription.update({
            where: { id: pendingTrial.id },
            data: {
              statusId: activeStatus.id,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
          return {
            message: 'Paiement déjà confirmé — abonnement activé',
            subscriptionId: pendingTrial.id,
            plan: plan.code,
            status: 'ACTIVE',
            paymentPending: false,
            alreadyCompleted: true,
          };
        }
        return {
          message: 'Reprise du paiement en cours',
          subscriptionId: pendingTrial.id,
          plan: plan.code,
          status: 'PENDING_PAYMENT',
          paymentPending: true,
          payment: {
            id: checkout.paymentId,
            redirectUrl: checkout.redirectUrl,
            reference: checkout.reference,
          },
          instructions: this.getPaymentInstructions('PAYSTACK', dto.phoneNumber, plan.priceFcfaMonthly),
          simulationMode: checkout.simulationMode === true,
        };
      }

      const checkout = await this.paymentsService.initiatePayment(userId, {
        providerCode: 'PAYSTACK',
        amount: plan.priceFcfaMonthly,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        planCode: plan.code,
        userSubscriptionId: pendingTrial.id,
        callbackUrl: dto.callbackUrl,
      });
      return {
        message: checkout.simulationMode
          ? 'Mode simulation — aucun débit réel'
          : 'Redirection vers le paiement sécurisé Paystack',
        subscriptionId: pendingTrial.id,
        plan: plan.code,
        status: 'PENDING_PAYMENT',
        paymentPending: true,
        payment: {
          id: checkout.paymentId,
          redirectUrl: checkout.redirectUrl,
          reference: checkout.reference,
        },
        simulationMode: checkout.simulationMode === true,
        instructions: this.getPaymentInstructions('PAYSTACK', dto.phoneNumber, plan.priceFcfaMonthly),
      };
    }

    const otherTrial = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'TRIAL' }, planId: { not: plan.id } },
    });
    if (otherTrial) {
      const cancelledStatus = await this.requireStatus('CANCELLED');
      await this.prisma.userSubscription.update({
        where: { id: otherTrial.id },
        data: { statusId: cancelledStatus.id },
      });
    }

    const [provider, trialStatus] = await Promise.all([
      this.requireProvider(dto.providerCode),
      this.requireStatus('TRIAL'),
    ]);

    if (plan.code === 'FREE') {
      throw new BadRequestException({
        code: 'SUB_002',
        message: 'Le plan gratuit ne nécessite pas de souscription explicite.',
      });
    }

    const now = new Date();
    const days = plan.billingDays > 0 ? plan.billingDays : 30;
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const sub = await this.prisma.userSubscription.create({
      data: {
        userId,
        planId: plan.id,
        statusId: trialStatus.id,
        providerId: provider.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    const checkout = await this.paymentsService.initiatePayment(userId, {
      providerCode: 'PAYSTACK',
      amount: plan.priceFcfaMonthly,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      planCode: plan.code,
      userSubscriptionId: sub.id,
      callbackUrl: dto.callbackUrl,
    });

    return {
      message: checkout.simulationMode
        ? 'Mode simulation — aucun débit réel'
        : 'Redirection vers le paiement sécurisé Paystack',
      subscriptionId: sub.id,
      plan: plan.code,
      status: 'PENDING_PAYMENT',
      paymentPending: true,
      payment: {
        id: checkout.paymentId,
        redirectUrl: checkout.redirectUrl,
        reference: checkout.reference,
      },
      simulationMode: checkout.simulationMode === true,
      instructions: this.getPaymentInstructions('PAYSTACK', dto.phoneNumber, plan.priceFcfaMonthly),
    };
  }

  // ── Annuler ─────────────────────────────────────────────────────────────────

  async cancel(userId: string, subscriptionId: string, dto: CancelSubscriptionDto) {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { id: subscriptionId, userId },
      include: { status: { select: { code: true } }, plan: { select: { code: true, label: true } } },
    });
    if (!sub) throw new NotFoundException({ code: 'SUB_003', message: 'Abonnement introuvable' });
    if (sub.status.code !== 'ACTIVE') throw new BadRequestException({ code: 'SUB_004', message: 'Seul un abonnement actif peut être annulé' });

    const atPeriodEnd = dto.atPeriodEnd !== false; // défaut: true

    if (atPeriodEnd) {
      await this.prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: { cancelAtPeriodEnd: true },
      });
      const cancelUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (cancelUser?.email) {
        this.mail.sendSubscriptionCancelledEmail({
          to: cancelUser.email,
          firstName: cancelUser.firstName ?? cancelUser.email,
          planLabel: sub.plan.label,
          cancelAtPeriodEnd: true,
          periodEnd: sub.currentPeriodEnd,
        }).catch((err: Error) => this.logger.error('Erreur email annulation abonnement', err.message));
      }
      return { message: `Abonnement annulé à la fin de la période (${sub.currentPeriodEnd.toLocaleDateString('fr-FR')})`, cancelAtPeriodEnd: true };
    }

    const cancelledStatus = await this.requireStatus('CANCELLED');
    await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { statusId: cancelledStatus.id, cancelAtPeriodEnd: false },
    });

    await this.notifications.dispatch({
      userId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Abonnement annulé',
      body: `Votre abonnement ${sub.plan.label} a été annulé immédiatement.`,
      data: { subscriptionId: sub.id, planCode: sub.plan.code },
    });

    const cancelUserImmediate = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (cancelUserImmediate?.email) {
      this.mail.sendSubscriptionCancelledEmail({
        to: cancelUserImmediate.email,
        firstName: cancelUserImmediate.firstName ?? cancelUserImmediate.email,
        planLabel: sub.plan.label,
        cancelAtPeriodEnd: false,
      }).catch((err: Error) => this.logger.error('Erreur email annulation immédiate', err.message));
    }

    return { message: 'Abonnement annulé immédiatement' };
  }

  // ── Webhook paiement Mobile Money ───────────────────────────────────────────

  async confirmPayment(transactionId: string, providerCode: string, status: 'success' | 'failed', metadata?: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { metadata: { path: ['providerCode'], equals: providerCode } },
      include: {
        userSubscription: true,
        status: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) return { handled: false };

    const newStatusCode = status === 'success' ? 'COMPLETED' : 'FAILED';
    const paymentStatus = await this.requirePaymentStatus(newStatusCode);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        statusId: paymentStatus.id,
        transactionId,
        paidAt: status === 'success' ? new Date() : null,
        metadata: { ...(payment.metadata as any), transactionId, ...metadata },
      },
    });

    if (status === 'failed' && payment.userSubscriptionId) {
      const failedStatus = await this.requireStatus('CANCELLED');
      await this.prisma.userSubscription.update({
        where: { id: payment.userSubscriptionId },
        data: { statusId: failedStatus.id },
      });
    }

    return { handled: true, paymentId: payment.id, status: newStatusCode };
  }

  // ── Plans disponibles ───────────────────────────────────────────────────────

  async listPlans(includeFree = false) {
    const where: any = { isActive: true, showInStore: true };
    if (!includeFree) where.code = { not: 'FREE' };
    return this.prisma.refUserPlan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { priceFcfaMonthly: 'asc' }],
      select: {
        code: true,
        label: true,
        tagline: true,
        priceFcfaMonthly: true,
        billingDays: true,
        maxScreens: true,
        videoQuality: true,
        hasAds: true,
        maxOfflineDownloads: true,
        hasExclusiveAccess: true,
      },
    });
  }

  // ── Renouvellement automatique (appelé par cron) ────────────────────────────

  async renewExpiredSubscriptions() {
    const now = new Date();
    const expiredSubs = await this.prisma.userSubscription.findMany({
      where: { status: { code: 'ACTIVE' }, currentPeriodEnd: { lte: now } },
      include: { plan: true, provider: true },
    });

    const expiredStatus = await this.requireStatus('EXPIRED');
    const renewedCount = { expired: 0, renewedAttempts: 0 };

    for (const sub of expiredSubs) {
      if (sub.cancelAtPeriodEnd) {
        await this.prisma.userSubscription.update({
          where: { id: sub.id },
          data: { statusId: expiredStatus.id },
        });
        renewedCount.expired++;
      } else {
        // Tentative de renouvellement automatique
        renewedCount.renewedAttempts++;
        await this.notifications.dispatch({
          userId: sub.userId,
          type: NotificationType.SUB_EXPIRING,
          title: 'Renouvellement en cours',
          body: `Votre abonnement ${sub.plan.label} est en cours de renouvellement.`,
          data: { subscriptionId: sub.id, planCode: sub.plan.code },
        });
      }
    }

    return renewedCount;
  }

  // ── Instructions paiement ───────────────────────────────────────────────────

  private getPaymentInstructions(providerCode: string, _phone?: string, amount?: number): string {
    if (providerCode === 'PAYSTACK') {
      return `Finalisez votre paiement de ${amount ?? '...'} FCFA sur la page sécurisée Paystack (carte ou Mobile Money selon options Paystack).`;
    }
    return `Finalisez votre paiement de ${amount ?? '...'} FCFA sur Paystack.`;
  }
}
