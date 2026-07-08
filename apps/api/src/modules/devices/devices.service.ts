import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/types';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      include: { deviceTokens: { select: { platform: true, updatedAt: true } } },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async register(userId: string, dto: { deviceType: string; deviceName?: string; os?: string; osVersion?: string; appVersion?: string; fingerprint?: string }) {
    if (dto.fingerprint) {
      const existing = await this.prisma.device.findFirst({ where: { userId, fingerprint: dto.fingerprint } });
      if (existing) {
        return this.prisma.device.update({ where: { id: existing.id }, data: { ...dto, lastSeenAt: new Date() } });
      }
    }

    // Un utilisateur qui possédait déjà au moins un appareil et en enregistre
    // un nouveau (fingerprint inconnu) reçoit une alerte de sécurité — pas
    // de notification sur le tout premier appareil (simple connexion initiale).
    const hadDevicesBefore = (await this.prisma.device.count({ where: { userId } })) > 0;
    const device = await this.prisma.device.create({ data: { userId, ...dto, lastSeenAt: new Date() } });

    if (hadDevicesBefore) {
      this.notifications.dispatch({
        userId,
        type: NotificationType.SECURITY_NEW_DEVICE,
        title: 'Nouvel appareil connecté',
        body: `Un nouvel appareil (${dto.deviceName ?? dto.deviceType}) a été connecté à votre compte.`,
        data: { deviceId: device.id, deviceType: dto.deviceType },
      }).catch(() => {});
    }

    return device;
  }

  async revoke(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException({ code: 'DEVICE_001', message: 'Appareil introuvable' });
    await this.prisma.device.delete({ where: { id: deviceId } });
    return { message: 'Appareil révoqué' };
  }

  async updatePushToken(userId: string, deviceId: string, token: string, platform: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException({ code: 'DEVICE_001', message: 'Appareil introuvable' });
    await this.prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } });
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { deviceId, token, platform },
      update: { platform },
    });
  }

  async loginHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where: { userId },
        include: { device: { select: { deviceType: true, deviceName: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.loginHistory.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }
}
