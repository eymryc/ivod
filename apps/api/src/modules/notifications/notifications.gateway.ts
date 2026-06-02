import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationWsEvent } from '@/common/types';

const configuredOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set(['http://localhost:3001', 'http://127.0.0.1:3001', ...configuredOrigins]),
);

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      (client as Socket & { userId?: string }).userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connecté: ${client.id} (user: ${payload.sub})`);
    } catch (err: unknown) {
      const reason =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name: string }).name)
          : 'JWT_VERIFY_FAILED';
      this.logger.warn(
        `Connexion WebSocket refusée (${reason}): ${client.id}` +
          (process.env.NODE_ENV !== 'production' ? ' — reconnectez-vous si JWT_SECRET a changé' : ''),
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('join_creator_room')
  handleJoinCreator(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { creatorId: string },
  ): void {
    const userId = (client as Socket & { userId?: string }).userId;
    if (!userId) return;
    client.join(`creator:${data.creatorId}`);
  }

  emitViewUpdate(creatorId: string, contentId: string, viewCount: number): void {
    this.server.to(`creator:${creatorId}`).emit('view_update', {
      contentId,
      viewCount,
      timestamp: new Date(),
    });
  }

  /** Relais temps réel vers la room utilisateur (namespace /notifications). */
  emitToUser(userId: string, event: NotificationWsEvent): void {
    if (!this.server) return;
    const { userId: _uid, ...clientPayload } = event;
    this.server.to(`user:${userId}`).emit('notification', clientPayload);
  }
}
