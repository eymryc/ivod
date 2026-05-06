import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─── Entry shapes ─────────────────────────────────────────────────────────────

export interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

export interface RegisterOtpEntry extends OtpEntry {
  firstName: string;
  lastName: string;
}

export interface ResetPasswordEntry {
  token: string;
  expiresAt: number;
  attempts: number;
}

type Namespace = 'otp' | 'register' | 'reset';

// ─── Redis interface (duck-typed to avoid hard dep when unavailable) ──────────

interface RedisClient {
  set(key: string, value: string, opts: { ex: number }): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class OtpStoreService implements OnModuleInit {
  private readonly logger = new Logger(OtpStoreService.name);

  private redis: RedisClient | null = null;

  // Fallback in-memory stores (single-instance dev only)
  private readonly memOtp = new Map<string, OtpEntry>();
  private readonly memRegister = new Map<string, RegisterOtpEntry>();
  private readonly memReset = new Map<string, ResetPasswordEntry>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = (this.config.get<string>('UPSTASH_REDIS_REST_URL') ?? '').trim();
    const token = (this.config.get<string>('UPSTASH_REDIS_REST_TOKEN') ?? '').trim();

    if (!url || !token) {
      this.logger.warn(
        'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — OTP store using in-memory fallback (not suitable for multi-instance).',
      );
      return;
    }

    try {
      // Dynamic import so the module compiles even without Upstash configured
      const { Redis } = await import('@upstash/redis');
      this.redis = new Redis({ url, token }) as unknown as RedisClient;
      this.logger.log('OTP store: using Upstash Redis.');
    } catch (err) {
      this.logger.error('Failed to initialise Upstash Redis client — falling back to in-memory.', err);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private key(ns: Namespace, id: string): string {
    return `ivod:otp:${ns}:${id}`;
  }

  private async redisGet<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async redisSet<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(key, JSON.stringify(value), { ex: ttlSec });
  }

  private async redisDel(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(key);
  }

  // ── Public API — Login OTP ───────────────────────────────────────────────────

  async setOtp(email: string, entry: OtpEntry, ttlSec: number): Promise<void> {
    if (this.redis) {
      await this.redisSet(this.key('otp', email), entry, ttlSec);
    } else {
      this.memOtp.set(email, entry);
    }
  }

  async getOtp(email: string): Promise<OtpEntry | null> {
    if (this.redis) {
      return this.redisGet<OtpEntry>(this.key('otp', email));
    }
    return this.memOtp.get(email) ?? null;
  }

  async updateOtp(email: string, entry: OtpEntry, ttlSec: number): Promise<void> {
    await this.setOtp(email, entry, ttlSec);
  }

  async deleteOtp(email: string): Promise<void> {
    if (this.redis) {
      await this.redisDel(this.key('otp', email));
    } else {
      this.memOtp.delete(email);
    }
  }

  // ── Public API — Register OTP ────────────────────────────────────────────────

  async setRegisterOtp(email: string, entry: RegisterOtpEntry, ttlSec: number): Promise<void> {
    if (this.redis) {
      await this.redisSet(this.key('register', email), entry, ttlSec);
    } else {
      this.memRegister.set(email, entry);
    }
  }

  async getRegisterOtp(email: string): Promise<RegisterOtpEntry | null> {
    if (this.redis) {
      return this.redisGet<RegisterOtpEntry>(this.key('register', email));
    }
    return this.memRegister.get(email) ?? null;
  }

  async updateRegisterOtp(email: string, entry: RegisterOtpEntry, ttlSec: number): Promise<void> {
    await this.setRegisterOtp(email, entry, ttlSec);
  }

  async deleteRegisterOtp(email: string): Promise<void> {
    if (this.redis) {
      await this.redisDel(this.key('register', email));
    } else {
      this.memRegister.delete(email);
    }
  }

  // ── Public API — Reset Password ──────────────────────────────────────────────

  async setResetPassword(email: string, entry: ResetPasswordEntry, ttlSec: number): Promise<void> {
    if (this.redis) {
      await this.redisSet(this.key('reset', email), entry, ttlSec);
    } else {
      this.memReset.set(email, entry);
    }
  }

  async getResetPassword(email: string): Promise<ResetPasswordEntry | null> {
    if (this.redis) {
      return this.redisGet<ResetPasswordEntry>(this.key('reset', email));
    }
    return this.memReset.get(email) ?? null;
  }

  async updateResetPassword(email: string, entry: ResetPasswordEntry, ttlSec: number): Promise<void> {
    await this.setResetPassword(email, entry, ttlSec);
  }

  async deleteResetPassword(email: string): Promise<void> {
    if (this.redis) {
      await this.redisDel(this.key('reset', email));
    } else {
      this.memReset.delete(email);
    }
  }

  // ── Cleanup (in-memory only, Redis TTL handles expiry natively) ──────────────

  cleanExpiredMemory(): void {
    if (this.redis) return; // Redis TTL handles this
    const now = Date.now();
    for (const [k, v] of this.memOtp) if (v.expiresAt < now) this.memOtp.delete(k);
    for (const [k, v] of this.memRegister) if (v.expiresAt < now) this.memRegister.delete(k);
    for (const [k, v] of this.memReset) if (v.expiresAt < now) this.memReset.delete(k);
  }
}
