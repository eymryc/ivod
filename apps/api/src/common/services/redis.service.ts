import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.get('REDIS_URL', 'redis://localhost:6379'), {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      lazyConnect: true,
    });
    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /** Retourne la valeur parsée ou null */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  /** Stocke avec TTL (secondes) */
  async set(key: string, value: unknown, ttlSec = 300): Promise<void> {
    try {
      await this.client.setex(key, ttlSec, JSON.stringify(value));
    } catch { /* silently fail — cache is not critical */ }
  }

  /** Supprime une clé */
  async del(key: string): Promise<void> {
    try { await this.client.del(key); } catch { }
  }

  /** Vérifie si une clé existe */
  async exists(key: string): Promise<boolean> {
    try { return (await this.client.exists(key)) === 1; } catch { return false; }
  }

  /** Alias JSON explicite — stocke avec TTL (secondes) */
  async setJson<T>(key: string, value: T, ttlSec: number): Promise<void> {
    return this.set(key, value, ttlSec);
  }

  /** Alias JSON explicite — retourne la valeur parsée ou null */
  async getJson<T>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  /** Supprime par pattern glob (ex: "contents:*") — utilise SCAN pour ne pas bloquer Redis */
  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const keys: string[] = [];
      do {
        const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      if (keys.length > 0) {
        // Supprimer par batch de 500 pour éviter les commandes trop longues
        for (let i = 0; i < keys.length; i += 500) {
          await this.client.del(...keys.slice(i, i + 500));
        }
      }
    } catch { }
  }

  /** Cache-aside : retourne le cache ou exécute fn() et met en cache */
  async remember<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSec);
    return value;
  }

  /** Incrément atomique (compteurs, rate limiting) */
  async incr(key: string, ttlSec?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (ttlSec && val === 1) await this.client.expire(key, ttlSec);
    return val;
  }

  /** Pub/Sub */
  async publish(channel: string, message: unknown): Promise<void> {
    try { await this.client.publish(channel, JSON.stringify(message)); } catch { }
  }

  /** Score de popularité pour un leaderboard sorted set */
  async zadd(key: string, score: number, member: string, ttlSec = 86400): Promise<void> {
    await this.client.zadd(key, score, member);
    await this.client.expire(key, ttlSec);
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) return this.client.zrange(key, start, stop, 'WITHSCORES');
    return this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop);
  }

  get raw(): Redis { return this.client; }
}
