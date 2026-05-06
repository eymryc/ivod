import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionsCron {
  private logger = new Logger('SubscriptionsCron');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async notifyIfNotSentRecently(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    withinHours = 20,
  ) {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, createdAt: { gte: since } },
      select: { id: true },
    });
    if (existing) return;
    await this.notifications.create(userId, type, title, body, data);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const now = new Date();
    const active = await this.prisma.subscriptionStatusRef.findUnique({ where: { code: 'ACTIVE' } });
    const expiredStatus = await this.prisma.subscriptionStatusRef.findUnique({ where: { code: 'EXPIRED' } });
    if (!active || !expiredStatus) return;

    // Rappels d'expiration (J-7, J-1) pour abonnements actifs.
    const upcoming = await this.prisma.subscription.findMany({
      where: { statusId: active.id, currentPeriodEnd: { gt: now } },
      include: { plan: { select: { code: true } } },
    });
    for (const sub of upcoming) {
      const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000);
      if (daysLeft === 7 || daysLeft === 1) {
        await this.notifyIfNotSentRecently(
          sub.userId,
          'subscription_expiring',
          `Abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
          `Votre abonnement ${sub.plan.code} expire bientôt. Renouvelez pour éviter l’interruption de service.`,
          { subscriptionId: sub.id, daysLeft, href: '/abonnements' },
          22,
        );
      }
    }

    // Expirer les subscriptions dont la période est dépassée
    const toExpire = await this.prisma.subscription.findMany({
      where: {
        statusId: active.id,
        currentPeriodEnd: { lt: now },
      },
      include: { plan: { select: { code: true } } },
    });
    const expired = await this.prisma.subscription.updateMany({
      where: {
        statusId: active.id,
        currentPeriodEnd: { lt: now },
      },
      data: { statusId: expiredStatus.id },
    });

    for (const sub of toExpire) {
      await this.notifyIfNotSentRecently(
        sub.userId,
        'subscription_expired',
        'Abonnement expiré',
        `Votre abonnement ${sub.plan.code} a expiré. Renouvelez pour continuer à accéder au contenu premium.`,
        { subscriptionId: sub.id, href: '/abonnements' },
        22,
      );
    }

    if (expired.count > 0) {
      this.logger.log(`${expired.count} abonnement(s) expiré(s)`);
    }

    // Source of truth is subscriptions. No direct user.plan rollback needed.
  }
}
