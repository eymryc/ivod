import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsCron {
  private logger = new Logger('SubscriptionsCron');

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const now = new Date();
    const active = await this.prisma.subscriptionStatusRef.findUnique({ where: { code: 'ACTIVE' } });
    const expiredStatus = await this.prisma.subscriptionStatusRef.findUnique({ where: { code: 'EXPIRED' } });
    if (!active || !expiredStatus) return;

    // Expirer les subscriptions dont la période est dépassée
    const expired = await this.prisma.subscription.updateMany({
      where: {
        statusId: active.id,
        currentPeriodEnd: { lt: now },
      },
      data: { statusId: expiredStatus.id },
    });

    if (expired.count > 0) {
      this.logger.log(`${expired.count} abonnement(s) expiré(s)`);
    }

    // Source of truth is subscriptions. No direct user.plan rollback needed.
  }
}
