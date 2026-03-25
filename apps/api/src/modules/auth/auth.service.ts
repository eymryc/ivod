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
import { createHash, randomBytes } from 'crypto';
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

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_PASSWORD_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_PASSWORD_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private otpStore = new Map<string, OtpEntry>();
  private registerOtpStore = new Map<string, RegisterOtpEntry>();
  private resetPasswordStore = new Map<string, ResetPasswordEntry>();
  private logger = new Logger('AuthService');

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  private generateOtp(): string {
    return Math.floor(10_000 + Math.random() * 90_000).toString();
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\s+/g, '');
  }

  private validateAuthIdentifier(email?: string, phone?: string) {
    if (!email && !phone) {
      throw new BadRequestException({
        code: 'AUTH_001',
        message: 'email ou phone est requis',
      });
    }
  }

  private buildAuthPayload(user: {
    id: string;
    email: string;
    role: string;
    plan: string;
    permissions?: string[];
    mustChangePassword?: boolean;
  }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      permissions: user.permissions ?? [],
      mustChangePassword: user.mustChangePassword ?? false,
    });
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    avatarUrl: string | null;
    role: string;
    plan: string;
    planExpiresAt: Date | null;
    createdAt: Date;
    permissions?: string[];
    roles?: string[];
    mustChangePassword?: boolean;
  }) {
    const accessToken = this.buildAuthPayload(user);
    return {
      message: 'Authentification reussie',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 604800,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        avatarUrl: user.avatarUrl,
        role: user.role,
        roles: user.roles ?? [user.role],
        permissions: user.permissions ?? [],
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  private async resolveAuthContext(userId: string, fallbackRole: string) {
    const userWithAccess = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
        userPermissions: { include: { permission: { select: { code: true } } } },
      },
    });

    if (!userWithAccess) {
      return { role: fallbackRole, roles: [fallbackRole], permissions: [] as string[] };
    }

    const roles = userWithAccess.userRoles.map((userRole) => userRole.role.code);
    const rolePermissions = userWithAccess.userRoles.flatMap((userRole) =>
      userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
    );
    const directPermissions = userWithAccess.userPermissions.map(
      (userPermission) => userPermission.permission.code,
    );
    const permissions = [...new Set([...rolePermissions, ...directPermissions])];
    const role = roles[0] ?? fallbackRole;

    return { role, roles, permissions };
  }

  private async attachDefaultRole(userId: string, fallbackRole = 'VIEWER') {
    const role = await this.prisma.role.findUnique({
      where: { code: fallbackRole },
      select: { id: true },
    });
    if (!role) {
      throw new InternalServerErrorException({
        code: 'RBAC_001',
        message: `Rôle référentiel introuvable : ${fallbackRole}. Exécuter les seeds RBAC (prisma:seed:rbac).`,
      });
    }

    await this.prisma.userRole.upsert({
      where: { userId },
      update: { roleId: role.id },
      create: { userId, roleId: role.id },
    });
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of this.otpStore) {
      if (entry.expiresAt < now) this.otpStore.delete(key);
    }
    for (const [key, entry] of this.registerOtpStore) {
      if (entry.expiresAt < now) this.registerOtpStore.delete(key);
    }
    for (const [key, entry] of this.resetPasswordStore) {
      if (entry.expiresAt < now) this.resetPasswordStore.delete(key);
    }
  }

  private generateResetToken(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async sendOTP(email: string) {
    this.cleanExpired();

    const code = this.generateOtp();
    this.otpStore.set(email, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    try {
      await this.mailService.sendOtpEmail(email, code);
    } catch (err) {
      this.logger.error(`Erreur envoi OTP à ${email}`, err);
      // En dev, on log le code pour faciliter les tests
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.warn(`[DEV] Code OTP pour ${email}: ${code}`);
      }
    }

    return { message: `Code OTP envoyé à ${email}`, expiresIn: 600 };
  }

  async verifyOTP(email: string, token: string) {
    const entry = this.otpStore.get(email);

    if (!entry || entry.expiresAt < Date.now()) {
      this.otpStore.delete(email);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }

    entry.attempts += 1;
    if (entry.attempts > OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(email);
      throw new UnauthorizedException({ code: 'AUTH_004', message: 'Trop de tentatives, demandez un nouveau code' });
    }

    if (entry.code !== token) {
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }

    // Code valide — supprimer de la mémoire
    this.otpStore.delete(email);

    let user = await this.prisma.user.findUnique({ where: { email } });
    let justCreated = false;
    if (!user) {
      const inferredFirstName = email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: inferredFirstName,
          lastName: '',
          name: inferredFirstName,
          role: 'VIEWER',
        },
      });
      justCreated = true;
    }

    if (justCreated) {
      try {
        await this.mailService.sendWelcomeEmail(user.email, user.name);
      } catch (err) {
        this.logger.warn(`Impossible d'envoyer l'email de bienvenue à ${user.email}`);
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException({ code: 'AUTH_006', message: 'Compte désactivé' });
    }

    await this.attachDefaultRole(user.id, user.role ?? 'VIEWER');
    const access = await this.resolveAuthContext(user.id, user.role);
    return this.buildAuthResponse({ ...user, ...access });
  }

  async sendRegisterOTP(email: string, firstName: string, lastName?: string) {
    this.cleanExpired();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = (lastName ?? '').trim();

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });
    }

    const code = this.generateOtp();
    this.registerOtpStore.set(normalizedEmail, {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    try {
      await this.mailService.sendOtpEmail(normalizedEmail, code);
    } catch (err) {
      this.logger.error(`Erreur envoi OTP inscription à ${normalizedEmail}`, err);
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.warn(`[DEV] Code OTP inscription pour ${normalizedEmail}: ${code}`);
      }
    }

    return { message: `Code OTP envoyé à ${normalizedEmail}`, expiresIn: 600 };
  }

  async verifyRegisterOTP(email: string, token: string, firstName: string, lastName?: string) {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = (lastName ?? '').trim();
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    this.cleanExpired();
    const normalizedEmail = email.toLowerCase().trim();
    const entry = this.registerOtpStore.get(normalizedEmail);

    if (!entry || entry.expiresAt < Date.now()) {
      this.registerOtpStore.delete(normalizedEmail);
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }

    entry.attempts += 1;
    if (entry.attempts > OTP_MAX_ATTEMPTS) {
      this.registerOtpStore.delete(normalizedEmail);
      throw new UnauthorizedException({
        code: 'AUTH_004',
        message: 'Trop de tentatives, demandez un nouveau code',
      });
    }

    if (entry.code !== token) {
      throw new UnauthorizedException({ code: 'AUTH_003', message: 'Code OTP invalide ou expiré' });
    }

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      this.registerOtpStore.delete(normalizedEmail);
      throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });
    }

    this.registerOtpStore.delete(normalizedEmail);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: normalizedFirstName || entry.firstName,
        lastName: normalizedLastName || entry.lastName,
        name: fullName || `${entry.firstName} ${entry.lastName}`.trim(),
        role: 'VIEWER',
      },
    });

    try {
      await this.mailService.sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de bienvenue à ${user.email}`);
    }

    await this.attachDefaultRole(user.id, 'VIEWER');
    const access = await this.resolveAuthContext(user.id, user.role);
    return this.buildAuthResponse({ ...user, ...access });
  }

  async registerWithPassword(dto: RegisterWithPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const phone = this.normalizePhone(dto.phone);

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });
    }

    if (phone) {
      const existingByPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingByPhone) {
        throw new ConflictException({ code: 'AUTH_008', message: 'Téléphone déjà utilisé' });
      }
    }

    const passwordHash = await hash(dto.password, 10);
    const displayName = dto.name.trim();
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: phone ?? null,
        name: displayName,
        passwordHash,
        role: 'VIEWER',
      },
    });

    try {
      await this.mailService.sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de bienvenue à ${user.email}`);
    }

    await this.attachDefaultRole(user.id, 'VIEWER');
    const access = await this.resolveAuthContext(user.id, user.role);
    return this.buildAuthResponse({ ...user, ...access });
  }

  async loginWithPassword(dto: LoginWithPasswordDto) {
    const email = dto.email?.toLowerCase().trim();
    const phone = this.normalizePhone(dto.phone);
    this.validateAuthIdentifier(email, phone);
    const identifiers = [] as Array<{ email?: string; phone?: string }>;
    if (email) identifiers.push({ email });
    if (phone) identifiers.push({ phone });

    const user = await this.prisma.user.findFirst({
      where: {
        OR: identifiers,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_002',
        message: 'Identifiants invalides',
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException({
        code: 'AUTH_015',
        message:
          'Mot de passe non défini. Ouvrez le lien « Choisir mon mot de passe » reçu par e-mail ou contactez un administrateur.',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({ code: 'AUTH_006', message: 'Compte désactivé' });
    }

    const passwordMatch = await compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException({
        code: 'AUTH_002',
        message: 'Identifiants invalides',
      });
    }

    await this.attachDefaultRole(user.id, user.role ?? 'VIEWER');
    const access = await this.resolveAuthContext(user.id, user.role);
    return this.buildAuthResponse({ ...user, ...access });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    this.cleanExpired();
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = this.generateResetToken();
      this.resetPasswordStore.set(email, {
        token,
        expiresAt: Date.now() + RESET_PASSWORD_TTL_MS,
        attempts: 0,
      });

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
      message:
        'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
      expiresIn: 900,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.cleanExpired();
    const email = dto.email.toLowerCase().trim();
    const entry = this.resetPasswordStore.get(email);

    if (!entry || entry.expiresAt < Date.now()) {
      this.resetPasswordStore.delete(email);
      throw new UnauthorizedException({
        code: 'AUTH_010',
        message: 'Code de réinitialisation invalide ou expiré',
      });
    }

    entry.attempts += 1;
    if (entry.attempts > RESET_PASSWORD_MAX_ATTEMPTS) {
      this.resetPasswordStore.delete(email);
      throw new UnauthorizedException({
        code: 'AUTH_011',
        message: 'Trop de tentatives, demandez un nouveau code',
      });
    }

    if (entry.token !== dto.token.toUpperCase()) {
      throw new UnauthorizedException({
        code: 'AUTH_010',
        message: 'Code de réinitialisation invalide ou expiré',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.resetPasswordStore.delete(email);
      throw new UnauthorizedException({
        code: 'AUTH_010',
        message: 'Code de réinitialisation invalide ou expiré',
      });
    }

    const passwordHash = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    this.resetPasswordStore.delete(email);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async setupPasswordFromInvite(dto: SetupPasswordDto) {
    const token = dto.token.trim();
    if (!token) {
      throw new BadRequestException({ code: 'AUTH_016', message: 'Jeton d’invitation manquant' });
    }

    const tokenSha = createHash('sha256').update(token, 'utf8').digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        passwordSetupTokenSha256: tokenSha,
        passwordSetupExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_014',
        message: 'Lien d’invitation invalide ou expiré. Contactez un administrateur pour en recevoir un nouveau.',
      });
    }

    const passwordHash = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordSetupTokenSha256: null,
        passwordSetupExpiresAt: null,
      },
    });

    const updated = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!updated) {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Session invalide' });
    }

    await this.attachDefaultRole(updated.id, updated.role ?? 'VIEWER');
    const access = await this.resolveAuthContext(updated.id, updated.role);
    return this.buildAuthResponse({ ...updated, ...access });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: 'AUTH_013',
        message: 'Compte sans mot de passe (utilisez la connexion OTP ou réinitialisation).',
      });
    }

    const passwordMatch = await compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException({
        code: 'AUTH_002',
        message: 'Mot de passe actuel incorrect',
      });
    }

    const passwordHash = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    const updated = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!updated) {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Session invalide' });
    }

    await this.attachDefaultRole(updated.id, updated.role ?? 'VIEWER');
    const access = await this.resolveAuthContext(updated.id, updated.role);
    return this.buildAuthResponse({ ...updated, ...access });
  }
}
