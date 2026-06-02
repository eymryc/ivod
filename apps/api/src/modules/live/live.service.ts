import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LiveService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private rtmpIngestUrl(): string {
    return this.config.get<string>('LIVE_RTMP_URL') ?? 'rtmp://live.ivod.africa/live';
  }

  private async resolveStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refLiveStreamStatus.findUniqueOrThrow({
      where: { code },
      select: { id: true },
    });
    return ref.id;
  }

  async listUpcoming(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.liveStream.findMany({
        where: { status: { code: { in: ['SCHEDULED', 'LIVE'] } } },
        include: {
          creator: { select: { stageName: true, avatarObjectKey: true } },
          liveEvents: true,
          status: { select: { code: true, label: true } },
        },
        orderBy: [{ scheduledStartAt: 'asc' }],
        skip, take: limit,
      }),
      this.prisma.liveStream.count({ where: { status: { code: { in: ['SCHEDULED', 'LIVE'] } } } }),
    ]);
    return { items, total, page, limit };
  }

  async create(userId: string, dto: { title: string; description?: string; scheduledStartAt?: string; type?: string; ticketPriceFcfa?: number }) {
    const creator = await this.prisma.creator.findUnique({ where: { userId }, select: { id: true } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    const streamKey = randomBytes(16).toString('hex');
    const statusId = await this.resolveStatusId('SCHEDULED');
    const stream = await this.prisma.liveStream.create({
      data: {
        creatorId: creator.id,
        title: dto.title,
        description: dto.description,
        streamKey,
        statusId,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
      },
    });
    if (dto.type) {
      await this.prisma.liveEvent.create({
        data: { liveStreamId: stream.id, type: dto.type, ticketPriceFcfa: dto.ticketPriceFcfa },
      });
    }
    return {
      ...stream,
      rtmpUrl: this.rtmpIngestUrl(),
      streamKey,
      hlsPlaybackUrl: this.config.get<string>('LIVE_HLS_PLAYBACK_URL') ?? null,
    };
  }

  async start(userId: string, streamId: string) {
    await this.checkOwner(userId, streamId);
    const statusId = await this.resolveStatusId('LIVE');
    return this.prisma.liveStream.update({
      where: { id: streamId },
      data: { statusId, startedAt: new Date() },
    });
  }

  async end(userId: string, streamId: string) {
    await this.checkOwner(userId, streamId);
    const statusId = await this.resolveStatusId('ENDED');
    return this.prisma.liveStream.update({
      where: { id: streamId },
      data: { statusId, endedAt: new Date() },
    });
  }

  async getOne(streamId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        creator: { select: { stageName: true, avatarObjectKey: true } },
        liveEvents: true,
        status: { select: { code: true, label: true } },
      },
    });
    if (!stream) throw new NotFoundException({ code: 'LIVE_001', message: 'Stream introuvable' });
    return stream;
  }

  private async checkOwner(userId: string, streamId: string) {
    const creator = await this.prisma.creator.findUnique({ where: { userId }, select: { id: true } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    const stream = await this.prisma.liveStream.findFirst({ where: { id: streamId, creatorId: creator.id } });
    if (!stream) throw new NotFoundException({ code: 'LIVE_001', message: 'Stream introuvable' });
    return stream;
  }
}
