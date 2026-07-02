import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogSecurityEventInput {
  actionCode: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityLogsService {
  private actionIdCache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  private async resolveActionId(code: string): Promise<string> {
    const cached = this.actionIdCache.get(code);
    if (cached) return cached;
    let row = await this.prisma.refSecurityLogAction.findUnique({ where: { code } });
    if (!row) {
      row = await this.prisma.refSecurityLogAction.create({
        data: { code, label: code },
      });
    }
    this.actionIdCache.set(code, row.id);
    return row.id;
  }

  async log(input: LogSecurityEventInput): Promise<void> {
    const actionId = await this.resolveActionId(input.actionCode);
    await this.prisma.securityLog.create({
      data: {
        userId: input.userId ?? null,
        actionId,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: {
          success: input.success ?? true,
          ...(input.metadata ?? {}),
        },
      },
    });
  }

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.action) {
      where.action = { code: params.action };
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { userId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.securityLog.findMany({
        where,
        include: {
          action: { select: { code: true, label: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityLog.count({ where }),
    ]);

    const items = rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        action: row.action.code,
        actionLabel: row.action.label,
        userId: row.userId,
        email: row.user?.email ?? null,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        success: meta.success !== false,
        countryCode: (meta.countryCode as string) ?? null,
        createdAt: row.createdAt,
      };
    });

    return { items, total, page, limit };
  }
}
