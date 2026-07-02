import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChangePasswordDto,
  SetupPasswordDto,
  ForgotPasswordDto,
  LoginWithPasswordDto,
  RegisterWithPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../../common/services/redis.service';
import { SecurityLogsService } from '../security-logs/security-logs.service';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface RegisterOtpEntry extends OtpEntry {
  firstName: string;
  lastName: string;
}

interface ResetPasswordEntry {
  token: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_SEC = 600;
const OTP_MAX_ATTEMPTS = 5;
const RESET_PASSWORD_TTL_SEC = 900;
const RESET_PASSWORD_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
    private redis: RedisService,
    private securityLogs: SecurityLogsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private generateOtp(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\s+/g, '');
  }

  private validateAuthIdentifier(email?: string, phone?: string) {
    if (!email && !phone) {
      throw new BadRequestException({ code: 'AUTH_001', message: 'email ou phone est requis' });
    }
  }

  // Affiché comme un code à saisir manuellement (voir
  // resetPasswordEmailTemplate — chaque caractère est espacé pour la
  // lecture), pas un lien cliquable — reste volontairement court à taper.
  // 6 octets (12 caractères hex, 48 bits) : un cran au-dessus des 4 octets
  // précédents pour plus de marge en défense en profondeur, déjà mitigé par
  // ailleurs par le TTL de 15 min et le verrou à 5 tentatives.
  private generateResetToken(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  // ─── RBAC helpers ───────────────────────────────────────────────────────────

  private async resolveRbacContext(userId: string): Promise<{
    role: string;
    roles: string[];
    permissions: string[];
    plan: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
            },
          },
        },
        userPermissions: { include: { permission: { select: { code: true } } } },
        userSubscriptions: {
          where: { status: { code: 'ACTIVE' } },
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1,
          include: { plan: { select: { code: true } } },
        },
      },
    });

    const roles = user?.userRoles.map((ur) => ur.role.code) ?? [];
    const rolePerms = user?.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.code),
    ) ?? [];
    const directPerms = user?.userPermissions.map((up) => up.permission.code) ?? [];
    const permissions = [...new Set([...rolePerms, ...directPerms])];
    const role = roles[0] ?? 'VIEWER';
    const plan = user?.userSubscriptions[0]?.plan?.code ?? 'FREE';

    return { role, roles, permissions, plan };
  }

  private async attachDefaultRole(userId: string) {
    const role = await this.prisma.role.findUnique({ where: { code: 'VIEWER' }, select: { id: true } });
    if (!role) {
      throw new InternalServerErrorException({
        code: 'RBAC_001',
        message: 'Rôle VIEWER introuvable. Exécutez le seed (prisma:seed).',
      });
    }
    // update vide : on ne remplace jamais un rôle existant par VIEWER
    await this.prisma.userRole.upsert({
      where: { userId },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  private async ensureDefaultProfile(userId: string, name: string) {
    const existing = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.profile.create({ data: { userId, name, isDefault: true } });
    }
  }

  // ─── JWT builder ────────────────────────────────────────────────────────────

  private buildJwt(user: { id: string; email: string; mustChangePassword?: boolean }, rbac: { role: string; roles: string[]; permissions: string[] }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: rbac.role,
      roles: rbac.roles,
      permissions: rbac.permissions,
      mustChangePassword: user.mustChangePassword ?? false,
    });
  }

  private getRefreshSecret(): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET is required but not set');
    return secret;
  }

  /** Parse "30d"/"900s"/"24h" — mêmes formats que JWT_REFRESH_EXPIRES_IN (jwt.sign expiresIn). */
  private parseDurationToSeconds(input: string, fallbackSec: number): number {
    const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
    if (!match) return fallbackSec;
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
    return Number(match[1]) * multiplier;
  }

  private refreshTokenKey(userId: string, jti: string): string {
    return `refresh:valid:${userId}:${jti}`;
  }

  /**
   * Rotation + révocation des refresh tokens (absentes avant ce correctif —
   * un token volé restait valide 30 jours sans recours, aucun endpoint de
   * logout n'existait). Chaque refresh token émis reçoit un jti unique
   * enregistré dans Redis ; il devient invalide dès qu'il est consommé par
   * un /auth/refresh (rotation) ou par /auth/logout (révocation explicite).
   */
  private async buildRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
    const ttlSec = this.parseDurationToSeconds(expiresIn, 30 * 86400);
    const jti = randomBytes(16).toString('hex');
    const token = this.jwt.sign({ sub: userId, type: 'refresh', jti }, { secret: this.getRefreshSecret(), expiresIn });
    await this.redis.set(this.refreshTokenKey(userId, jti), true, ttlSec);
    return token;
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.redis.delPattern(this.refreshTokenKey(userId, '*'));
  }

  async refreshAccessToken(refreshToken: string) {
    const secret = this.getRefreshSecret();
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_017', message: 'Refresh token invalide ou expiré' });
    }
    if (payload?.type !== 'refresh') throw new UnauthorizedException({ code: 'AUTH_017', message: 'Token invalide' });

    const userId = payload.sub as string;
    const jti = payload.jti as string | undefined;

    // Rétrocompatibilité : un refresh token émis AVANT ce correctif n'a pas
    // de jti — on ne peut pas vérifier sa rotation, mais on ne le rejette
    // pas non plus (sinon tous les utilisateurs déjà connectés au moment du
    // déploiement seraient déconnectés de force). Tout nouveau token émis
    // à partir de maintenant a systématiquement un jti.
    if (jti) {
      const key = this.refreshTokenKey(userId, jti);
      const stillValid = await this.redis.exists(key);
      if (!stillValid) {
        // jti absent de Redis : soit déjà consommé par une rotation
        // précédente (réutilisation d'un vieux token — vol probable), soit
        // jamais émis par nous. Dans les deux cas, on révoque TOUTE la
        // famille de refresh tokens de cet utilisateur par précaution.
        await this.revokeAllRefreshTokens(userId);
        this.logger.warn(`Réutilisation de refresh token détectée (user ${userId}) — famille révoquée`);
        throw new UnauthorizedException({ code: 'AUTH_018', message: 'Session invalide — reconnexion requise' });
      }
      await this.redis.del(key); // consommé — la rotation ci-dessous émet le suivant
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException({ code: 'AUTH_001', message: 'Compte introuvable ou désactivé' });

    const rbac = await this.resolveRbacContext(user.id);
    const accessToken = this.buildJwt(user, rbac);
    const newRefreshToken = await this.buildRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }

  /** Logout — révoque le refresh token présenté (idempotent : jamais d'erreur si déjà invalide/expiré). */
  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      const payload: any = this.jwt.verify(refreshToken, { secret: this.getRefreshSecret() });
      if (payload?.sub && payload?.jti) {
        await this.redis.del(this.refreshTokenKey(payload.sub, payload.jti));
      }
    } catch {
      // Token déjà invalide/expiré — rien à révoquer, logout idempotent.
    }
    return { message: 'Déconnecté' };
  }

  private async recordLoginHistory(userId: string, ipAddress?: string, userAgent?: string, success = true) {
    this.prisma.loginHistory.create({ data: { userId, ipAddress, userAgent, success } }).catch(() => {});
  }

  private async buildAuthResponse(
    user: { id: string; email: string; name: string; firstName: string; lastName: string; avatarUrl: string | null; createdAt: Date; mustChangePassword?: boolean },
    rbac: { role: string; roles: string[]; permissions: string[]; plan: string },
  ) {
    const accessToken = this.buildJwt(user, rbac);
    const refreshToken = await this.buildRefreshToken(user.id);
    return {
      message: 'Authentification réussie',
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresIn: 2592000,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: rbac.role,
        roles: rbac.roles,
        permissions: rbac.permissions,
        plan: rbac.plan,
        createdAt: user.createdAt,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  // ─── OTP flow ────────────────────────────────────────────────────────────────

  async sendOTP(email: string) {
    const code = this.generateOtp();
    await this.redis.setJson<OtpEntry>(`otp:${email}`, { code, expiresAt: Date.now() + OTP_TTL_SEC * 1000, attempts: 0 }, OTP_TTL_SEC);

    try {
      await this.mailService.sendOtpEmail(email, code);
    } catch (err) {
      this.logger.error(`Erreur envoi OTP à ${email}`, err);
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.warn(`[DEV] Code OTP pour ${email}: ${code}`);
      }
    }
    return { message: `Code OTP envoyé à ${email}`, expiresIn: OTP_TTL_SEC };
  }

  async verifyOTP(email: string, token: string) {
    const entry = await this.redis.getJson<OtpEntry>(`otp:${email}`);
    if (!entry || entry.expiresAt < Date.now()) {
      await this.redis.del(`otp:${email}`);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }
    entry.attempts += 1;
    if (entry.attempts > OTP_MAX_ATTEMPTS) {
      await this.redis.del(`otp:${email}`);
      throw new UnauthorizedException({ code: 'AUTH_004', message: 'Trop de tentatives, demandez un nouveau code' });
    }
    if (entry.code !== token) {
      // Persister le compteur de tentatives mis à jour
      await this.redis.setJson<OtpEntry>(`otp:${email}`, entry, OTP_TTL_SEC);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }
    await this.redis.del(`otp:${email}`);

    let user = await this.prisma.user.findUnique({ where: { email } });
    let justCreated = false;
    if (!user) {
      const inferredFirstName = email.split('@')[0];
      user = await this.prisma.user.create({
        data: { email, firstName: inferredFirstName, lastName: '', name: inferredFirstName },
      });
      justCreated = true;
    }

    if (!user.isActive) throw new UnauthorizedException({ code: 'AUTH_006', message: 'Compte désactivé' });

    await this.attachDefaultRole(user.id);
    await this.ensureDefaultProfile(user.id, user.name);

    if (justCreated) {
      try { await this.mailService.sendWelcomeEmail(user.email, user.name); } catch { /* non bloquant */ }
    }

    const rbac = await this.resolveRbacContext(user.id);
    return this.buildAuthResponse(user, rbac);
  }

  async sendRegisterOTP(email: string, firstName: string, lastName?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });

    const code = this.generateOtp();
    await this.redis.setJson<RegisterOtpEntry>(`register_otp:${normalizedEmail}`, {
      firstName: firstName.trim(),
      lastName: (lastName ?? '').trim(),
      code,
      expiresAt: Date.now() + OTP_TTL_SEC * 1000,
      attempts: 0,
    }, OTP_TTL_SEC);

    try {
      await this.mailService.sendOtpEmail(normalizedEmail, code);
    } catch (err) {
      this.logger.error(`Erreur envoi OTP inscription à ${normalizedEmail}`, err);
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.warn(`[DEV] Code OTP inscription pour ${normalizedEmail}: ${code}`);
      }
    }
    return { message: `Code OTP envoyé à ${normalizedEmail}`, expiresIn: OTP_TTL_SEC };
  }

  async verifyRegisterOTP(email: string, token: string, firstName: string, lastName?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const entry = await this.redis.getJson<RegisterOtpEntry>(`register_otp:${normalizedEmail}`);

    if (!entry || entry.expiresAt < Date.now()) {
      await this.redis.del(`register_otp:${normalizedEmail}`);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }
    entry.attempts += 1;
    if (entry.attempts > OTP_MAX_ATTEMPTS) {
      await this.redis.del(`register_otp:${normalizedEmail}`);
      throw new UnauthorizedException({ code: 'AUTH_004', message: 'Trop de tentatives, demandez un nouveau code' });
    }
    if (entry.code !== token) {
      await this.redis.setJson<RegisterOtpEntry>(`register_otp:${normalizedEmail}`, entry, OTP_TTL_SEC);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      await this.redis.del(`register_otp:${normalizedEmail}`);
      throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });
    }

    await this.redis.del(`register_otp:${normalizedEmail}`);

    const fn = (firstName?.trim() || entry.firstName);
    const ln = (lastName?.trim() || entry.lastName);
    const fullName = `${fn} ${ln}`.trim();

    const user = await this.prisma.user.create({
      data: { email: normalizedEmail, firstName: fn, lastName: ln, name: fullName },
    });

    await this.attachDefaultRole(user.id);
    await this.ensureDefaultProfile(user.id, user.name);

    try { await this.mailService.sendWelcomeEmail(user.email, user.name); } catch { /* non bloquant */ }

    const rbac = await this.resolveRbacContext(user.id);
    return this.buildAuthResponse(user, rbac);
  }

  // ─── Password flows ──────────────────────────────────────────────────────────

  async registerWithPassword(dto: RegisterWithPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const phone = this.normalizePhone(dto.phone);

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });

    if (phone) {
      const existingByPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingByPhone) throw new ConflictException({ code: 'AUTH_008', message: 'Téléphone déjà utilisé' });
    }

    const passwordHash = await hash(dto.password, 10);
    const firstName = dto.firstName?.trim() ?? '';
    const lastName = dto.lastName?.trim() ?? '';
    const displayName = dto.name?.trim()
      || [firstName, lastName].filter(Boolean).join(' ')
      || email.split('@')[0];
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: phone ?? null,
        name: displayName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        passwordHash,
      },
    });

    await this.attachDefaultRole(user.id);
    await this.ensureDefaultProfile(user.id, user.name);
    try { await this.mailService.sendWelcomeEmail(user.email, user.name); } catch { /* non bloquant */ }

    const rbac = await this.resolveRbacContext(user.id);
    return this.buildAuthResponse(user, rbac);
  }

  async loginWithPassword(dto: LoginWithPasswordDto) {
    const email = dto.email?.toLowerCase().trim();
    const phone = this.normalizePhone(dto.phone);
    this.validateAuthIdentifier(email, phone);

    const user = await this.prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });

    if (!user) {
      await this.securityLogs.log({ actionCode: 'FAILED_LOGIN', success: false, metadata: { email, phone } });
      throw new UnauthorizedException({ code: 'AUTH_002', message: 'Identifiants invalides' });
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException({
        code: 'AUTH_015',
        message: 'Mot de passe non défini. Utilisez le lien reçu par e-mail ou contactez un administrateur.',
      });
    }
    if (!user.isActive) throw new UnauthorizedException({ code: 'AUTH_006', message: 'Compte désactivé' });

    const passwordMatch = await compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.securityLogs.log({
        actionCode: 'FAILED_LOGIN',
        userId: user.id,
        success: false,
        metadata: { email: user.email },
      });
      throw new UnauthorizedException({ code: 'AUTH_002', message: 'Identifiants invalides' });
    }

    await this.attachDefaultRole(user.id);
    await this.ensureDefaultProfile(user.id, user.name);

    await this.recordLoginHistory(user.id, undefined, undefined, true);
    await this.securityLogs.log({
      actionCode: 'LOGIN',
      userId: user.id,
      success: true,
      metadata: { email: user.email },
    });
    const rbac = await this.resolveRbacContext(user.id);
    return this.buildAuthResponse(user, rbac);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = this.generateResetToken();
      await this.redis.setJson<ResetPasswordEntry>(`reset_pwd:${email}`, { token, expiresAt: Date.now() + RESET_PASSWORD_TTL_SEC * 1000, attempts: 0 }, RESET_PASSWORD_TTL_SEC);
      try {
        await this.mailService.sendResetPasswordEmail(email, token);
      } catch (err) {
        this.logger.error(`Erreur envoi reset password à ${email}`, err);
        if (this.config.get('NODE_ENV') !== 'production') {
          this.logger.warn(`[DEV] Token reset password pour ${email}: ${token}`);
        }
      }
    }

    return {
      message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
      expiresIn: RESET_PASSWORD_TTL_SEC,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const entry = await this.redis.getJson<ResetPasswordEntry>(`reset_pwd:${email}`);

    if (!entry || entry.expiresAt < Date.now()) {
      await this.redis.del(`reset_pwd:${email}`);
      throw new UnauthorizedException({ code: 'AUTH_010', message: 'Code de réinitialisation invalide ou expiré' });
    }
    entry.attempts += 1;
    if (entry.attempts > RESET_PASSWORD_MAX_ATTEMPTS) {
      await this.redis.del(`reset_pwd:${email}`);
      throw new UnauthorizedException({ code: 'AUTH_011', message: 'Trop de tentatives, demandez un nouveau code' });
    }
    if (entry.token !== dto.token.toUpperCase()) {
      await this.redis.setJson<ResetPasswordEntry>(`reset_pwd:${email}`, entry, RESET_PASSWORD_TTL_SEC);
      throw new UnauthorizedException({ code: 'AUTH_010', message: 'Code de réinitialisation invalide ou expiré' });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.redis.del(`reset_pwd:${email}`);
      throw new UnauthorizedException({ code: 'AUTH_010', message: 'Code de réinitialisation invalide ou expiré' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(dto.newPassword, 10), mustChangePassword: false },
    });
    await this.redis.del(`reset_pwd:${email}`);
    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async verifySetupToken(token: string): Promise<{ valid: boolean; email?: string }> {
    if (!token?.trim()) return { valid: false };
    const tokenSha = createHash('sha256').update(token.trim(), 'utf8').digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordSetupTokenSha256: tokenSha, passwordSetupExpiresAt: { gt: new Date() } },
      select: { email: true },
    });
    if (!user) return { valid: false };
    return { valid: true, email: user.email };
  }

  async setupPasswordFromInvite(dto: SetupPasswordDto) {
    if (!dto.token?.trim()) throw new BadRequestException({ code: 'AUTH_016', message: "Jeton d'invitation manquant" });

    const tokenSha = createHash('sha256').update(dto.token.trim(), 'utf8').digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordSetupTokenSha256: tokenSha, passwordSetupExpiresAt: { gt: new Date() } },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_014',
        message: "Lien d'invitation invalide ou expiré. Contactez un administrateur.",
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(dto.newPassword, 10),
        mustChangePassword: false,
        passwordSetupTokenSha256: null,
        passwordSetupExpiresAt: null,
      },
    });

    await this.attachDefaultRole(user.id);
    await this.ensureDefaultProfile(user.id, user.name);

    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const rbac = await this.resolveRbacContext(user.id);
    return this.buildAuthResponse(updated, rbac);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: 'AUTH_013',
        message: 'Compte sans mot de passe (utilisez la connexion OTP ou réinitialisation).',
      });
    }
    if (!(await compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({ code: 'AUTH_002', message: 'Mot de passe actuel incorrect' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(dto.newPassword, 10), mustChangePassword: false },
    });

    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const rbac = await this.resolveRbacContext(userId);
    return this.buildAuthResponse(updated, rbac);
  }
}
