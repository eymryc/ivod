import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private analytics: AnalyticsService,
  ) {}

  // Vérifier les abonnements expirés toutes les heures
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredSubscriptions() {
    try {
      const result = await this.subscriptions.renewExpiredSubscriptions();
      if (result.expired > 0 || result.renewedAttempts > 0) {
        this.logger.log(`Subscriptions: ${result.expired} expired, ${result.renewedAttempts} renewal attempts`);
      }
    } catch (e) {
      this.logger.error('Subscription cron failed', e);
    }
  }

  // Rafraîchir les tendances toutes les 24h
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshTrendingSearches() {
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
  }

  // Rafraîchir les stats des contenus publiés chaque nuit
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshContentStats() {
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
  }
}
