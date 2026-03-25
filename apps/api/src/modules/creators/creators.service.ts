import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  CreateCreatorAdminDto,
  CreateCreatorDto,
  CreateCreatorFullAdminDto,
  UpdateCreatorDto,
} from './dto/creators.dto';

const PASSWORD_SETUP_TTL_MS = 72 * 3600 * 1000;

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}
  private static readonly CREATOR_REVENUE_SHARE = 0.6;

  private async requireRoleId(roleCode: string) {
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
      select: { id: true },
    });
    if (!role) {
      throw new InternalServerErrorException({
        code: 'RBAC_001',
        message: `Rôle référentiel introuvable : ${roleCode}. Exécuter les seeds RBAC (prisma:seed:rbac).`,
      });
    }
    return role.id;
  }

  /** Un seul rôle par utilisateur (`user_roles.userId` = PK). */
  private async replaceUserRbacRoleTx(tx: Prisma.TransactionClient, userId: string, roleId: string) {
    await tx.userRole.upsert({
      where: { userId },
      update: { roleId },
      create: { userId, roleId },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creator.findMany({
        include: {
          user: { select: { email: true } },
          _count: { select: { contents: true } },
        },
        skip,
        take: limit,
        orderBy: { subscriberCount: 'desc' },
      }),
      this.prisma.creator.count(),
    ]);
    return { items, total, page, limit };
  }

  /** Liste réservée au back-office : indique si l’invitation mot de passe est encore en attente (sans exposer de hash). */
  async findAllForAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.creator.findMany({
        include: {
          user: { select: { email: true, passwordHash: true } },
          _count: { select: { contents: true } },
        },
        skip,
        take: limit,
        orderBy: { subscriberCount: 'desc' },
      }),
      this.prisma.creator.count(),
    ]);
    const items = rows.map(({ user, ...c }) => ({
      ...c,
      user: user ? { email: user.email } : undefined,
      invitePending: !user?.passwordHash,
    }));
    return { items, total, page, limit };
  }

  /**
   * Régénère le jeton d’invitation et renvoie l’e-mail (comptes sans mot de passe encore défini).
   */
  async resendCreatorInvite(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: { user: true },
    });
    if (!creator) {
      throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });
    }
    const { user } = creator;
    if (user.passwordHash) {
      throw new BadRequestException({
        code: 'CREATOR_011',
        message:
          'Ce compte a déjà un mot de passe. Utilisez la réinitialisation par e-mail ou la connexion classique.',
      });
    }

    const setupTokenPlain = randomBytes(32).toString('base64url');
    const passwordSetupTokenSha256 = createHash('sha256').update(setupTokenPlain, 'utf8').digest('hex');
    const passwordSetupExpiresAt = new Date(Date.now() + PASSWORD_SETUP_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordSetupTokenSha256,
        passwordSetupExpiresAt,
        mustChangePassword: true,
      },
    });

    const base = this.config.get<string>('FRONTEND_URL') ?? '';
    const front = base.replace(/\/$/, '');
    const setupUrl = `${front}/onboarding/definir-mot-de-passe?token=${encodeURIComponent(setupTokenPlain)}`;

    let emailSent = true;
    try {
      await this.mailService.sendCreatorAccountCreatedEmail({
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        stageName: creator.stageName,
        bio: creator.bio,
        setupUrl,
        setupExpiresInHours: Math.round(PASSWORD_SETUP_TTL_MS / 3600_000),
      });
    } catch (err) {
      emailSent = false;
      this.logger.warn(`E-mail invitation créateur non envoyé pour ${user.email}: ${err}`);
    }

    return {
      id: creator.id,
      message: emailSent
        ? 'Invitation renvoyée (nouveau lien valide ~72 h).'
        : 'Jeton régénéré mais l’e-mail n’a pas pu être envoyé (vérifiez la configuration mail).',
      emailSent,
    };
  }

  async findOne(id: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id },
      include: {
        contents: {
          where: { status: { code: 'PUBLISHED' } },
          orderBy: { publishedAt: 'desc' },
          take: 12,
          select: {
            id: true, title: true, thumbnailUrl: true,
            category: { select: { code: true } },
            duration: true, viewCount: true,
            visibility: true, publishedAt: true,
          },
        },
        _count: { select: { contents: true } },
      },
    });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });
    // Normalize category response shape for the frontend (expects `category` as a string code)
    const normalized = creator as any;
    if (Array.isArray(normalized.contents)) {
      normalized.contents = normalized.contents.map((c: any) => {
        const category = c.category?.code;
        const { category: _category, ...rest } = c;
        return { ...rest, category };
      });
    }
    return normalized;
  }

  async register(userId: string, dto: CreateCreatorDto) {
    const existing = await this.prisma.creator.findUnique({ where: { userId } });
    if (existing) throw new ConflictException({ code: 'CREATOR_003', message: 'Compte créateur déjà existant' });

    const creatorRoleId = await this.requireRoleId('CREATOR');

    return this.prisma.$transaction(async (tx) => {
      const creator = await tx.creator.create({
        data: { userId, stageName: dto.stageName, bio: dto.bio },
      });
      await tx.user.update({
        where: { id: userId },
        data: { role: 'CREATOR' },
      });
      await this.replaceUserRbacRoleTx(tx, userId, creatorRoleId);
      return creator;
    });
  }

  async create(dto: CreateCreatorAdminDto) {
    const existing = await this.prisma.creator.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException({ code: 'CREATOR_003', message: 'Compte créateur déjà existant' });

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const creatorRoleId = await this.requireRoleId('CREATOR');

    return this.prisma.$transaction(async (tx) => {
      const creator = await tx.creator.create({
        data: { userId: dto.userId, stageName: dto.stageName, bio: dto.bio },
      });
      await tx.user.update({
        where: { id: dto.userId },
        data: { role: 'CREATOR' },
      });
      await this.replaceUserRbacRoleTx(tx, dto.userId, creatorRoleId);
      return { ...creator, message: 'Profil créateur créé. Rôle CREATOR appliqué (JWT / guards).' };
    });
  }

  /**
   * Création utilisateur + profil créateur par l’admin (rôle CREATOR + RBAC), e-mail avec identifiants.
   */
  async createFullForAdmin(dto: CreateCreatorFullAdminDto) {
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone?.replace(/\s+/g, '') || undefined;

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException({ code: 'AUTH_007', message: 'Email déjà utilisé' });
    }
    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        throw new ConflictException({ code: 'AUTH_008', message: 'Téléphone déjà utilisé' });
      }
    }

    const rawPassword = dto.password?.trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const name = `${firstName} ${lastName}`.trim() || email;
    const creatorRoleId = await this.requireRoleId('CREATOR');
    const verified = dto.verified ?? true;

    let passwordHash: string | null = null;
    let passwordSetupTokenSha256: string | null = null;
    let passwordSetupExpiresAt: Date | null = null;
    let setupTokenPlain: string | undefined;
    let passwordPlainForEmail: string | undefined;
    let passwordWasGenerated = false;

    if (rawPassword) {
      passwordPlainForEmail = rawPassword;
      passwordWasGenerated = false;
      passwordHash = await hash(rawPassword, 10);
    } else {
      setupTokenPlain = randomBytes(32).toString('base64url');
      passwordSetupTokenSha256 = createHash('sha256').update(setupTokenPlain, 'utf8').digest('hex');
      passwordSetupExpiresAt = new Date(Date.now() + PASSWORD_SETUP_TTL_MS);
    }

    const { user, creator } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone: phone ?? null,
          firstName,
          lastName,
          name,
          passwordHash,
          role: 'CREATOR',
          mustChangePassword: true,
          passwordSetupTokenSha256,
          passwordSetupExpiresAt,
        },
      });
      const creator = await tx.creator.create({
        data: {
          userId: user.id,
          stageName: dto.stageName.trim(),
          bio: dto.bio?.trim() || null,
          verified,
        },
      });
      await this.replaceUserRbacRoleTx(tx, user.id, creatorRoleId);
      return { user, creator };
    });

    const base = this.config.get<string>('FRONTEND_URL') ?? '';
    const front = base.replace(/\/$/, '');
    const loginUrl = `${front}/onboarding/connexion?mode=password`;
    const setupUrl = setupTokenPlain
      ? `${front}/onboarding/definir-mot-de-passe?token=${encodeURIComponent(setupTokenPlain)}`
      : undefined;

    let emailSent = true;
    try {
      await this.mailService.sendCreatorAccountCreatedEmail({
        to: email,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        stageName: creator.stageName,
        bio: creator.bio,
        setupUrl,
        setupExpiresInHours: 72,
        ...(setupUrl
          ? {}
          : {
              loginUrl,
              password: passwordPlainForEmail,
              passwordWasGenerated,
            }),
      });
    } catch (err) {
      emailSent = false;
      this.logger.warn(`E-mail créateur non envoyé pour ${email}: ${err}`);
    }

    return {
      ...creator,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      message: emailSent
        ? 'Compte créateur créé. Un e-mail récapitulatif a été envoyé.'
        : 'Compte créateur créé. L’e-mail n’a pas pu être envoyé (vérifiez la configuration mail).',
      emailSent,
    };
  }

  async update(id: string, dto: UpdateCreatorDto) {
    const creator = await this.prisma.creator.findUnique({ where: { id } });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });

    return this.prisma.creator.update({
      where: { id },
      data: {
        stageName: dto.stageName,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        bannerUrl: dto.bannerUrl,
        verified: dto.verified,
      },
    });
  }

  async remove(id: string) {
    const creator = await this.prisma.creator.findUnique({ where: { id } });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });

    const viewerRoleId = await this.requireRoleId('VIEWER');

    await this.prisma.$transaction(async (tx) => {
      await tx.creator.delete({ where: { id } });
      await tx.user.update({
        where: { id: creator.userId },
        data: { role: 'VIEWER' },
      });
      await this.replaceUserRbacRoleTx(tx, creator.userId, viewerRoleId);
    });

    return { id, message: 'Créateur supprimé' };
  }

  async getMyProfile(userId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, plan: true } },
        _count: { select: { contents: true } },
      },
    });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Compte créateur introuvable' });
    return creator;
  }

  async getMyContents(userId: string, page = 1, limit = 20) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where: { creatorId: creator.id },
        include: {
          category: { select: { code: true } },
          status: { select: { code: true } },
          contentType: { select: { code: true } },
          _count: { select: { episodes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where: { creatorId: creator.id } }),
    ]);
    const normalized = items.map((item: any) => {
      const category = item.category?.code;
      const status = item.status?.code;
      const contentKind = item.contentType?.code;
      const episodeCount = item._count?.episodes ?? 0;
      const { category: _c, status: _s, contentType: _t, _count: _cnt, ...rest } = item;
      return {
        ...rest,
        category,
        status,
        contentType: contentKind,
        episodeCount,
      };
    });
    return { items: normalized, total, page, limit };
  }

  async getAnalytics(userId: string, period = '30d') {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Contenus publiés du créateur
    const contents = await this.prisma.content.findMany({
      where: { creatorId: creator.id, status: { code: 'PUBLISHED' } },
      select: {
        id: true, title: true, viewCount: true, duration: true,
      },
      orderBy: { viewCount: 'desc' },
    });

    const contentIds = contents.map(c => c.id);

    // Historique de visionnage dans la période
    const watchRecords = await this.prisma.watchHistory.findMany({
      where: {
        contentId: { in: contentIds },
        lastWatchedAt: { gte: since },
      },
      select: {
        userId: true,
        contentId: true,
        watchedSeconds: true,
        percentage: true,
      },
    });

    // Métriques agrégées
    const totalViews = contents.reduce((sum, c) => sum + c.viewCount, 0);
    const uniqueViewerIds = new Set(watchRecords.map(w => w.userId));
    const totalWatchSeconds = watchRecords.reduce((sum, w) => sum + w.watchedSeconds, 0);
    const avgPercentage = watchRecords.length > 0
      ? Math.round((watchRecords.reduce((sum, w) => sum + w.percentage, 0) / watchRecords.length) * 10) / 10
      : 0;

    // Top contenus (basé sur les vues réelles)
    const viewsByContent = new Map<string, { views: number; seconds: number }>();
    for (const w of watchRecords) {
      const cur = viewsByContent.get(w.contentId) ?? { views: 0, seconds: 0 };
      cur.views += 1;
      cur.seconds += w.watchedSeconds;
      viewsByContent.set(w.contentId, cur);
    }

    const topContents = contents.slice(0, 5).map(c => {
      const stats = viewsByContent.get(c.id) ?? { views: 0, seconds: 0 };
      return {
        id: c.id,
        title: c.title,
        views: c.viewCount,
        watchTimeHours: Math.round(stats.seconds / 3600),
        earned: 0, // Revenus par contenu non trackés individuellement pour l'instant
      };
    });

    // Revenus réels depuis les paiements (fallback) + statements (source prioritaire)
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { code: 'SUCCEEDED' },
        paidAt: { gte: since },
        user: {
          watchHistory: { some: { contentId: { in: contentIds } } },
        },
      },
      select: { amount: true, paidAt: true },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const rightsholderId = creator.id;
    const statement = await this.prisma.revenueStatement.aggregate({
      where: {
        beneficiaryRightsholderId: rightsholderId,
        periodStart: { gte: since },
      },
      _sum: {
        beneficiaryAmount: true,
      },
    });
    const creatorShare = statement._sum.beneficiaryAmount ?? Math.round(totalRevenue * CreatorsService.CREATOR_REVENUE_SHARE);
    const platformShare = Math.max(totalRevenue - creatorShare, 0);

    // Prochain 1er du mois
    const now = new Date();
    const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      period,
      overview: {
        totalViews,
        uniqueViewers: uniqueViewerIds.size,
        watchTimeHours: Math.round(totalWatchSeconds / 3600),
        averageWatchPercentage: avgPercentage,
        newFollowers: creator.subscriberCount,
        totalEarned: creator.totalEarned,
        currency: 'XOF',
      },
      earnings: {
        total: creatorShare,
        gross: totalRevenue,
        platformShare,
        split: { creator: 0.6, platform: 0.4 },
        pending: 0,
        nextPayout: nextPayout.toISOString(),
      },
      topContents,
    };
  }
}
