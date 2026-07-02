import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Sans cet adaptateur, `server.to(room).emit(...)` (NotificationsGateway) ne
 * diffuse qu'aux sockets connectées AU MÊME PROCESS Node — avec 2 réplicas
 * API (api_1/api_2, voir docker-compose.prod.yml) derrière le load-balancing
 * Nginx, un événement émis par api_2 n'atteindrait jamais un client connecté
 * à api_1. Le pub/sub Redis partage les événements entre tous les réplicas.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => this.logger.error('Redis pub (Socket.io adapter) error', err.message));
    subClient.on('error', (err) => this.logger.error('Redis sub (Socket.io adapter) error', err.message));

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.io Redis adapter connecté — événements diffusés entre tous les réplicas API');
  }

  createIOServer(port: number, options?: ServerOptions): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);
    if (!this.adapterConstructor) {
      throw new Error('RedisIoAdapter.connectToRedis() doit être appelé avant createIOServer()');
    }
    server.adapter(this.adapterConstructor);
    return server;
  }
}
