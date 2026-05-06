import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async create(userId: string, type: string, title: string, body: string, data?: Record<string, any>) {
    const created = await this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });
    this.gateway.emitNotificationCreated(userId, created as unknown as Record<string, unknown>);
    return created;
  }

  /** Utilisateurs à notifier (colonne legacy `role` + rôle RBAC ADMIN). */
  private async adminUserIds(): Promise<string[]> {
    const [legacy, rbac] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }),
      this.prisma.user.findMany({
        where: { userRoles: { some: { role: { code: 'ADMIN' } } } },
        select: { id: true },
      }),
    ]);
    return [...new Set([...legacy.map((u) => u.id), ...rbac.map((u) => u.id)])];
  }

  /** Notifie chaque administrateur (best-effort, ne lève pas si une ligne échoue). */
  async notifyAdmins(type: string, title: string, body: string, data?: Record<string, unknown>) {
    const ids = await this.adminUserIds();
    await Promise.all(
      ids.map((userId) =>
        this.create(userId, type, title, body, data as Record<string, any>).catch(() => undefined),
      ),
    );
  }

  async list(userId: string, page = 1, limit = 20, type?: string) {
    const skip = (page - 1) * limit;
    const where = type ? { userId, type } : { userId };
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, total, unreadCount, page, limit };
  }

  async delete(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) throw new NotFoundException({ code: 'NOTIF_001', message: 'Notification introuvable' });
    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { message: 'Notification supprimée' };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return { message: 'Notification lue' };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { message: `${result.count} notification(s) marquée(s) comme lue(s)` };
  }
}
