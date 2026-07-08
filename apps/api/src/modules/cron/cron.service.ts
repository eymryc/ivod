import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../../common/services/redis.service';
import { NotificationType } from '../../common/types';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private analytics: AnalyticsService,
    private notifications: NotificationsService,
    private mail: MailService,
    private redis: RedisService,
    private admin: AdminService,
  ) {}

  /**
   * Verrou distribué (Redis) — en production, api_1 ET api_2 chargent tous
   * les deux ce CronService (IVOD_APP_MODE=api sur les 2 réplicas, voir
   * docker-compose.prod.yml). Sans ce verrou, chaque @Cron() s'exécutait
   * deux fois à chaque déclenchement (double envoi d'emails, double appel de
   * renouvellement d'abonnement...). Le réplica qui n'obtient pas le verrou
   * sort immédiatement sans rien faire.
   */
  private async withLock(name: string, ttlSec: number, fn: () => Promise<void>): Promise<void> {
    const acquired = await this.redis.acquireLock(`cron:${name}`, ttlSec);
    if (!acquired) {
      this.logger.debug(`Cron ${name} : verrou déjà pris par un autre réplica, skip`);
      return;
    }
    try {
      await fn();
    } finally {
      await this.redis.releaseLock(`cron:${name}`);
    }
  }

  // Vérifier les abonnements expirés toutes les heures
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredSubscriptions() {
    await this.withLock('checkExpiredSubscriptions', 300, async () => {
      try {
        const result = await this.subscriptions.renewExpiredSubscriptions();
        if (result.expired > 0 || result.renewedAttempts > 0) {
          this.logger.log(`Subscriptions: ${result.expired} expired, ${result.renewedAttempts} renewal attempts`);
        }
      } catch (e) {
        this.logger.error('Subscription cron failed', e);
      }
    });
  }

  // Rafraîchir les tendances toutes les 24h
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshTrendingSearches() {
    await this.withLock('refreshTrendingSearches', 600, async () => {
      try {
        const yesterday = new Date(Date.now() - 24 * 3600000);
        const searches = await this.prisma.searchHistory.groupBy({
          by: ['query'],
          where: { createdAt: { gte: yesterday } },
          _count: { query: true },
          orderBy: { _count: { query: 'desc' } },
          take: 50,
        });
        for (const s of searches) {
          await this.prisma.trendingSearch.upsert({
            where: { query_period: { query: s.query, period: '24h' } },
            create: { query: s.query, period: '24h', searchCount: s._count.query },
            update: { searchCount: s._count.query },
          });
        }
        this.logger.log(`Trending searches refreshed: ${searches.length}`);
      } catch (e) {
        this.logger.error('Trending cron failed', e);
      }
    });
  }

  // Notifier les abonnements qui expirent dans 3 jours (chaque jour à 9h)
  @Cron('0 9 * * *')
  async notifyExpiringSubscriptions() {
    await this.withLock('notifyExpiringSubscriptions', 900, async () => {
      try {
        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 24 * 3600_000);
        const subs = await this.prisma.userSubscription.findMany({
          where: {
            status: { code: 'ACTIVE' },
            currentPeriodEnd: { gte: now, lte: in3Days },
          },
          include: {
            user: { select: { id: true, email: true, firstName: true } },
            plan: { select: { code: true, label: true } },
          },
          take: 500,
        });
        let notified = 0;
        for (const sub of subs) {
          await this.notifications.dispatch({
            userId: sub.userId,
            type: NotificationType.SUB_EXPIRING,
            title: 'Abonnement bientôt expiré',
            body: `Votre abonnement ${sub.plan.label} expire le ${sub.currentPeriodEnd?.toLocaleDateString('fr-FR') ?? ''}.`,
            data: { subscriptionId: sub.id, planCode: sub.plan.code },
          }).catch(() => {});
          if (sub.user?.email && sub.currentPeriodEnd) {
            await this.mail.sendSubscriptionExpiringEmail({
              to: sub.user.email,
              firstName: sub.user.firstName ?? sub.user.email,
              planLabel: sub.plan.label,
              expiresAt: sub.currentPeriodEnd,
            }).catch(() => {});
          }
          notified++;
        }
        if (notified > 0) this.logger.log(`Abonnements expirants notifiés : ${notified}`);
      } catch (e) {
        this.logger.error('Cron SUB_EXPIRING échoué', e);
      }
    });
  }

  // Rafraîchir les stats des contenus publiés chaque nuit
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshContentStats() {
    await this.withLock('refreshContentStats', 900, async () => {
      try {
        const contents = await this.prisma.content.findMany({
          where: { status: { code: 'PUBLISHED' } },
          select: { id: true },
          take: 500,
        });
        let count = 0;
        for (const c of contents) {
          await this.analytics.refreshContentStats(c.id);
          count++;
        }
        this.logger.log(`Content stats refreshed: ${count}`);
      } catch (e) {
        this.logger.error('Stats cron failed', e);
      }
    });
  }

  // Publier les contenus APPROVED dont la date de sortie programmée est atteinte
  @Cron(CronExpression.EVERY_5_MINUTES)
  async publishScheduledContent() {
    await this.withLock('publishScheduledContent', 240, async () => {
      try {
        const due = await this.prisma.content.findMany({
          where: { status: { code: 'APPROVED' }, releaseDate: { lte: new Date() } },
          select: { id: true },
          take: 200,
        });
        for (const c of due) {
          await this.admin.publishScheduledContent(c.id);
        }
        if (due.length > 0) this.logger.log(`Contenus programmés publiés : ${due.length}`);
      } catch (e) {
        this.logger.error('Cron publishScheduledContent échoué', e);
      }
    });
  }
}
