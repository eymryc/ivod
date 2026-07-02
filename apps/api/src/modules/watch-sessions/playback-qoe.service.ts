import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface RecordQoEDto {
  sessionId?: string;
  contentId: string;
  episodeId?: string;
  assetId?: string;
  eventType: 'startup' | 'rebuffer' | 'quality_change' | 'error';
  payload?: Record<string, unknown>;
}

@Injectable()
export class PlaybackQoEService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, dto: RecordQoEDto) {
    let profileId: string | null = null;
    if (dto.sessionId) {
      const session = await this.prisma.watchSession.findFirst({
        where: { id: dto.sessionId, profile: { userId } },
        select: { id: true, profileId: true },
      });
      if (!session) {
        throw new NotFoundException({ code: 'WATCH_002', message: 'Session introuvable' });
      }
      profileId = session.profileId;
    }

    const event = await this.prisma.playbackQoEEvent.create({
      data: {
        sessionId: dto.sessionId ?? null,
        contentId: dto.contentId,
        episodeId: dto.episodeId ?? null,
        assetId: dto.assetId ?? null,
        profileId,
        eventType: dto.eventType,
        payload:
          dto.payload != null ? (dto.payload as Prisma.InputJsonValue) : undefined,
      },
    });

    return { id: event.id, recorded: true };
  }

  async getContentSummary(contentId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.prisma.playbackQoEEvent.findMany({
      where: { contentId, createdAt: { gte: since } },
      select: { eventType: true, payload: true },
    });

    const startup = events.filter((e) => e.eventType === 'startup');
    const rebuffer = events.filter((e) => e.eventType === 'rebuffer');
    const errors = events.filter((e) => e.eventType === 'error');

    const startupMs = startup
      .map((e) => Number((e.payload as { ms?: number })?.ms))
      .filter((n) => Number.isFinite(n) && n > 0);

    return {
      periodDays: days,
      totalEvents: events.length,
      startupCount: startup.length,
      rebufferCount: rebuffer.length,
      errorCount: errors.length,
      medianStartupMs:
        startupMs.length > 0
          ? startupMs.sort((a, b) => a - b)[Math.floor(startupMs.length / 2)]
          : null,
    };
  }

  async getCreatorQoESummary(creatorId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const contents = await this.prisma.content.findMany({
      where: { creatorId },
      select: { id: true, title: true },
    });
    const contentIds = contents.map((c) => c.id);
    if (contentIds.length === 0) {
      return { periodDays: days, byContent: [], totals: { startup: 0, rebuffer: 0, error: 0 } };
    }

    const grouped = await this.prisma.playbackQoEEvent.groupBy({
      by: ['contentId', 'eventType'],
      where: { contentId: { in: contentIds }, createdAt: { gte: since } },
      _count: { _all: true },
    });

    const byContent = contents.map((c) => {
      const rows = grouped.filter((g) => g.contentId === c.id);
      const pick = (type: string) => rows.find((r) => r.eventType === type)?._count._all ?? 0;
      return {
        contentId: c.id,
        title: c.title,
        startup: pick('startup'),
        rebuffer: pick('rebuffer'),
        qualityChange: pick('quality_change'),
        error: pick('error'),
      };
    });

    const totals = {
      startup: grouped.filter((g) => g.eventType === 'startup').reduce((s, g) => s + g._count._all, 0),
      rebuffer: grouped.filter((g) => g.eventType === 'rebuffer').reduce((s, g) => s + g._count._all, 0),
      error: grouped.filter((g) => g.eventType === 'error').reduce((s, g) => s + g._count._all, 0),
    };

    return { periodDays: days, byContent, totals };
  }
}
