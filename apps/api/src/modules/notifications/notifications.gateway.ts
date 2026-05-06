import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

const configuredOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    ...configuredOrigins,
  ]),
);

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger('NotificationsGateway');

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
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

      (client as any).userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connecté: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Connexion WebSocket refusée (token invalide): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('join_creator_room')
  handleJoinCreator(@ConnectedSocket() client: Socket, @MessageBody() data: { creatorId: string }) {
    const userId = (client as any).userId;
    if (!userId) return;
    client.join(`creator:${data.creatorId}`);
  }

  emitViewUpdate(creatorId: string, contentId: string, viewCount: number) {
    this.server.to(`creator:${creatorId}`).emit('view_update', {
      contentId, viewCount, timestamp: new Date(),
    });
  }

  emitPipelineProgress(
    userId: string,
    assetId: string,
    stage: 'probe' | 'transcode',
    pct: number,
    episodeId?: string | null,
  ) {
    this.server.to(`user:${userId}`).emit('pipeline:progress', {
      assetId,
      stage,
      pct: Math.max(0, Math.min(100, Math.round(pct))),
      episodeId: episodeId ?? null,
      timestamp: new Date(),
    });
  }

  emitVideoReady(userId: string, contentId: string, title: string) {
    const payload = {
      contentId, title, timestamp: new Date(),
    };
    this.server.to(`user:${userId}`).emit('video_ready', payload);
    this.server.to(`user:${userId}`).emit('notification:new', { type: 'video_ready', ...payload });
  }

  emitPaymentConfirmed(userId: string, plan: string) {
    const payload = {
      plan, timestamp: new Date(),
    };
    this.server.to(`user:${userId}`).emit('payment_confirmed', payload);
    this.server.to(`user:${userId}`).emit('notification:new', { type: 'payment_confirmed', ...payload });
  }

  emitNotificationCreated(userId: string, notification: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }
}
