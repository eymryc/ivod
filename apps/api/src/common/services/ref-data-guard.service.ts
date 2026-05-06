import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CONTENT_STATUS, CONTENT_VISIBILITY, PLAN_CODE, SUBSCRIPTION_STATUS } from '../constants/content.constants';

/**
 * RefDataGuardService — valide au démarrage que la base de données contient bien
 * tous les codes de référence définis dans content.constants.ts.
 *
 * Si un code manque en DB, un avertissement critique est loggué (pas de crash en prod
 * pour ne pas bloquer le démarrage sur une DB partiellement seedée).
 *
 * Source canonique unique : prisma/ref-data.js → seed → DB → constants TS (mirror).
 */
@Injectable()
export class RefDataGuardService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RefDataGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.validateRefs();
  }

  private async validateRefs(): Promise<void> {
    const errors: string[] = [];

    errors.push(...(await this.checkCodes(
      'ContentStatusRef',
      () => this.prisma.contentStatusRef.findMany({ select: { code: true } }),
      Object.values(CONTENT_STATUS),
    )));

    errors.push(...(await this.checkCodes(
      'ContentVisibilityRef',
      () => this.prisma.contentVisibilityRef.findMany({ select: { code: true } }),
      Object.values(CONTENT_VISIBILITY),
    )));

    errors.push(...(await this.checkCodes(
      'UserPlanRef',
      () => this.prisma.userPlanRef.findMany({ select: { code: true } }),
      Object.values(PLAN_CODE),
    )));

    errors.push(...(await this.checkCodes(
      'SubscriptionStatusRef',
      () => this.prisma.subscriptionStatusRef.findMany({ select: { code: true } }),
      Object.values(SUBSCRIPTION_STATUS),
    )));

    if (errors.length > 0) {
      this.logger.error(
        `[RefDataGuard] ⚠️  ${errors.length} code(s) manquants en base — relancez le seed (npm run prisma:seed:all):\n` +
          errors.map((e) => `  • ${e}`).join('\n'),
      );
    } else {
      this.logger.log('[RefDataGuard] ✅ Tous les codes de référence sont présents en base.');
    }
  }

  private async checkCodes(
    table: string,
    fetcher: () => Promise<{ code: string }[]>,
    expectedCodes: readonly string[],
  ): Promise<string[]> {
    try {
      const rows = await fetcher();
      const existing = new Set(rows.map((r) => r.code));
      return expectedCodes
        .filter((c) => !existing.has(c))
        .map((c) => `${table}: code "${c}" absent (défini dans content.constants.ts mais absent de la DB)`);
    } catch {
      return [`${table}: impossible de lire la table (DB inaccessible ?)`];
    }
  }
}
