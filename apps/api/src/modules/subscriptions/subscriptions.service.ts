import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutCinetpayDto, CheckoutStripeDto } from './dto/subscriptions.dto';

const PLANS = {
  PREMIUM: { amount: 1000, label: 'iVOD Premium' },
  PREMIUM_PLUS: { amount: 2000, label: 'iVOD Premium+' },
};

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10' as any,
    });
  }

  private async getSubscriptionStatusId(code: string) {
    const ref = await this.prisma.subscriptionStatusRef.findUnique({ where: { code } });
    if (!ref) throw new BadRequestException({ code: 'REF_001', message: `Status inconnu: ${code}` });
    return ref.id;
  }

  private async getPaymentStatusId(code: string) {
    const ref = await this.prisma.paymentStatusRef.findUnique({ where: { code } });
    if (!ref) throw new BadRequestException({ code: 'REF_001', message: `Status paiement inconnu: ${code}` });
    return ref.id;
  }

  private async getPaymentProviderId(code: string) {
    const ref = await this.prisma.paymentProviderRef.findUnique({ where: { code } });
    if (!ref) throw new BadRequestException({ code: 'REF_001', message: `Provider inconnu: ${code}` });
    return ref.id;
  }

  // ── CinetPay ──────────────────────────────────────────────────────────────

  async checkoutCinetpay(userId: string, dto: CheckoutCinetpayDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const plan = PLANS[dto.plan];
    const transactionId = `ivod_${userId}_${Date.now()}`;

    const pendingStatusId = await this.getPaymentStatusId('PENDING');
    const cinetpayProviderId = await this.getPaymentProviderId('CINETPAY');

    // Créer un paiement pending
    await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.amount,
        currency: 'XOF',
        statusId: pendingStatusId,
        providerId: cinetpayProviderId,
        transactionId,
        metadata: { plan: dto.plan },
      },
    });

    const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', {
      apikey: this.config.get('CINETPAY_API_KEY'),
      site_id: this.config.get('CINETPAY_SITE_ID'),
      transaction_id: transactionId,
      amount: plan.amount,
      currency: 'XOF',
      description: `Abonnement ${plan.label}`,
      return_url: dto.returnUrl,
      notify_url: dto.notifyUrl,
      customer_email: user.email,
      customer_name: user.name,
      channels: 'ALL',
      lang: 'FR',
    });

    if (response.data.code !== '201') {
      throw new BadRequestException({ code: 'PAYMENT_FAILED', message: 'Erreur lors de la création du paiement' });
    }

    return {
      paymentUrl: response.data.data.payment_url,
      transactionId,
      amount: plan.amount,
      currency: 'XOF',
      plan: dto.plan,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  async handleCinetpayWebhook(body: any) {
    const { cpm_trans_id } = body;

    const payment = await this.prisma.payment.findUnique({
      where: { transactionId: cpm_trans_id },
    });
    if (!payment) return;

    // Vérifier le statut réel auprès de CinetPay (ne jamais faire confiance au body du webhook)
    const verification = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
      apikey: this.config.get('CINETPAY_API_KEY'),
      site_id: this.config.get('CINETPAY_SITE_ID'),
      transaction_id: cpm_trans_id,
    });

    const verifiedStatus = verification.data?.data?.status;
    const verifiedAmount = Number(verification.data?.data?.amount);

    if (verifiedStatus === 'ACCEPTED' && verifiedAmount === payment.amount) {
      const succeededStatusId = await this.getPaymentStatusId('SUCCEEDED');
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { statusId: succeededStatusId, paidAt: new Date() },
      });

      const plan = (payment.metadata as any)?.plan as 'PREMIUM' | 'PREMIUM_PLUS';
      const planRef = await this.prisma.userPlanRef.findUnique({ where: { code: plan } });
      if (!planRef) throw new BadRequestException({ code: 'PLAN_001', message: 'Plan invalide' });
      const activeSubStatusId = await this.getSubscriptionStatusId('ACTIVE');
      const cinetpayProviderId = await this.getPaymentProviderId('CINETPAY');
      const now = new Date();

      // Prolonger l'abonnement existant ou en créer un nouveau
      const existingSub = await this.prisma.subscription.findFirst({
        where: { userId: payment.userId, status: { code: 'ACTIVE' } },
      });

      const periodStart = existingSub && existingSub.currentPeriodEnd > now
        ? existingSub.currentPeriodEnd
        : now;
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSub) {
        await this.prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: planRef.id,
            statusId: activeSubStatusId,
            providerId: cinetpayProviderId,
            currentPeriodEnd: periodEnd,
            payments: { connect: { id: payment.id } },
          },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId: payment.userId,
            planId: planRef.id,
            statusId: activeSubStatusId,
            providerId: cinetpayProviderId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            payments: { connect: { id: payment.id } },
          },
        });
      }
    } else if (verifiedStatus === 'REFUSED' || verifiedStatus === 'CANCELLED') {
      const failedStatusId = await this.getPaymentStatusId('FAILED');
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { statusId: failedStatusId },
      });
    }
    // Si le statut est PENDING on ignore — CinetPay renverra un webhook
  }

  // ── Stripe ─────────────────────────────────────────────────────────────────

  async checkoutStripe(userId: string, dto: CheckoutStripeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const priceId = dto.plan === 'PREMIUM'
      ? this.config.get('STRIPE_PRICE_PREMIUM')!
      : this.config.get('STRIPE_PRICE_PREMIUM_PLUS')!;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { userId, plan: dto.plan },
      locale: 'fr',
    });

    return { paymentUrl: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(payload: Buffer, sig: string) {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET')!;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, sig, secret);
    } catch {
      throw new BadRequestException('Signature webhook invalide');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId!;
      const plan = session.metadata?.plan as 'PREMIUM' | 'PREMIUM_PLUS';
      const planRef = await this.prisma.userPlanRef.findUnique({ where: { code: plan } });
      if (!planRef) throw new BadRequestException({ code: 'PLAN_001', message: 'Plan invalide' });
      const succeededStatusId = await this.getPaymentStatusId('SUCCEEDED');
      const stripeProviderId = await this.getPaymentProviderId('STRIPE');
      const activeSubStatusId = await this.getSubscriptionStatusId('ACTIVE');

      const now = new Date();

      await this.prisma.payment.create({
        data: {
          userId,
          amount: plan === 'PREMIUM' ? 1000 : 2000,
          currency: 'XOF',
          statusId: succeededStatusId,
          providerId: stripeProviderId,
          transactionId: session.id,
          paidAt: new Date(),
          metadata: { plan, stripeSessionId: session.id },
        },
      });

      // Prolonger ou créer
      const existingSub = await this.prisma.subscription.findFirst({
        where: { userId, status: { code: 'ACTIVE' } },
      });

      const periodStart = existingSub && existingSub.currentPeriodEnd > now
        ? existingSub.currentPeriodEnd
        : now;
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSub) {
        await this.prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: planRef.id,
            statusId: activeSubStatusId,
            providerId: stripeProviderId,
            externalId: session.subscription as string,
            currentPeriodEnd: periodEnd,
          },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId,
            planId: planRef.id,
            statusId: activeSubStatusId,
            providerId: stripeProviderId,
            externalId: session.subscription as string,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const cancelledStatusId = await this.getSubscriptionStatusId('CANCELLED');
      await this.prisma.subscription.updateMany({
        where: { externalId: sub.id },
        data: { statusId: cancelledStatusId, cancelAtPeriodEnd: true },
      });
    }
  }

  // ── Consultation ──────────────────────────────────────────────────────────

  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true } }, status: { select: { code: true } } },
    });

    const payments = await this.prisma.payment.findMany({
      where: { userId, status: { code: 'SUCCEEDED' } },
      orderBy: { paidAt: 'desc' },
      take: 10,
      include: { status: { select: { code: true } }, provider: { select: { code: true } } },
    });

    const renewsIn = sub
      ? Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86400000)
      : 0;

    if (!sub) return null;
    const { plan, status, ...rest } = sub as any;
    const paymentHistory = payments.map((p: any) => {
      const { status: payStatus, provider: payProvider, ...pr } = p;
      return { ...pr, status: payStatus?.code, provider: payProvider?.code };
    });
    return { ...rest, plan: plan?.code ?? 'FREE', status: status?.code, renewsIn, paymentHistory };
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
    });
    if (!sub) throw new NotFoundException({ code: 'SUB_001', message: 'Aucun abonnement actif' });

    const provider = await this.prisma.paymentProviderRef.findUnique({ where: { id: sub.providerId } });
    if (sub.externalId && provider?.code === 'STRIPE') {
      await this.stripe.subscriptions.update(sub.externalId, {
        cancel_at_period_end: true,
      });
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    return { message: 'Abonnement annulé en fin de période', cancelAtPeriodEnd: true };
  }
}
