import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import {
  DispatchNotificationInput,
  NotificationType,
  NotificationWsEvent,
} from '@/common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPublisher } from './notification.publisher';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: NotificationPublisher,
  ) {}

  /**
   * Persiste la notification et la publie sur Redis pour émission WebSocket (API).
   */
  async dispatch<T extends NotificationType>(
    input: DispatchNotificationInput<T>,
  ): Promise<Notification> {
    const record = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.publisher.publish(this.toWsEvent(record));
    return record;
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, total, unreadCount, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'Notification lue' };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: `${result.count} notification(s) marquée(s) comme lue(s)` };
  }

  private toWsEvent(record: Notification): NotificationWsEvent {
    return {
      id: record.id,
      userId: record.userId,
      type: record.type as NotificationType,
      title: record.title,
      body: record.body,
      data: (record.data ?? {}) as NotificationWsEvent['data'],
      createdAt: record.createdAt.toISOString(),
    };
  }
}
