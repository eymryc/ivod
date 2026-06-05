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

import { ContentDurationService } from '../../common/services/content-duration.service';
import { isSeriesType } from '../../common/constants/content-types';
import { PlaybackQoEService } from '../watch-sessions/playback-qoe.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private config: ConfigService,
    private readonly contentDuration: ContentDurationService,
    private readonly playbackQoE: PlaybackQoEService,
    private readonly redis: RedisService,
  ) {}

  /** Invalide le cache RBAC d'un utilisateur après un changement de rôle. */
  private async invalidateRbacCache(userId: string) {
    await this.redis.del(`rbac:user:${userId}`);
  }
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
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true,
              passwordHash: true,
              userRoles: {
                include: { role: { select: { code: true, label: true } } },
              },
            },
          },
          _count: { select: { contents: true, followers: true } },
        },
        skip,
        take: limit,
        orderBy: { subscriberCount: 'desc' },
      }),
      this.prisma.creator.count(),
    ]);
    const items = rows.map(({ user, _count, ...c }) => ({
      ...c,
      user: user
        ? {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            createdAt: user.createdAt,
            roles: user.userRoles?.map((ur) => ur.role) ?? [],
          }
        : undefined,
      invitePending: !user?.passwordHash,
      contentCount: _count?.contents ?? 0,
      followerCount: _count?.followers ?? 0,
    }));
    return { items, total, page, limit };
  }

  async findOneForAdmin(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: true,
            mustChangePassword: true,
            userRoles: {
              include: { role: { select: { code: true, label: true } } },
            },
          },
        },
        contents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            title: true,
            slug: true,
            status: { select: { code: true, label: true } },
            contentType: { select: { code: true, label: true } },
            viewCount: true,
            duration: true,
            createdAt: true,
            publishedAt: true,
          },
        },
        _count: { select: { contents: true, followers: true } },
      },
    });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });

    const { user, contents, _count, ...rest } = creator;
    return {
      ...rest,
      invitePending: !user?.passwordHash,
      contentCount: _count.contents,
      followerCount: _count.followers,
      user: user
        ? {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            roles: user.userRoles.map((ur) => ur.role),
            hasPassword: !!user.passwordHash,
          }
        : null,
      contents: contents.map((c) => ({
        ...c,
        status: c.status?.code,
        statusLabel: c.status?.label,
        contentType: c.contentType?.code,
        contentTypeLabel: c.contentType?.label,
      })),
    };
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
    const setupUrl = `${front}/auth/setup-password?token=${encodeURIComponent(setupTokenPlain)}`;

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
            id: true, title: true, slug: true,
            duration: true, viewCount: true,
            contentType: { select: { code: true } },
            visibility: { select: { code: true } },
            contentGenres: { include: { genre: { select: { code: true, label: true } } } },
            mediaAssets: { where: { type: { code: 'THUMBNAIL' }, isPrimary: true }, take: 1, select: { objectKey: true } },
            publishedAt: true,
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

    const creator = await this.prisma.$transaction(async (tx) => {
      const created = await tx.creator.create({
        data: { userId, stageName: dto.stageName, bio: dto.bio },
      });
      await this.replaceUserRbacRoleTx(tx, userId, creatorRoleId);
      return created;
    });
    await this.invalidateRbacCache(userId);
    return creator;
  }

  async create(dto: CreateCreatorAdminDto) {
    const existing = await this.prisma.creator.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException({ code: 'CREATOR_003', message: 'Compte créateur déjà existant' });

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const creatorRoleId = await this.requireRoleId('CREATOR');

    const result = await this.prisma.$transaction(async (tx) => {
      const creator = await tx.creator.create({
        data: { userId: dto.userId, stageName: dto.stageName, bio: dto.bio },
      });
      await this.replaceUserRbacRoleTx(tx, dto.userId, creatorRoleId);
      return { ...creator, message: 'Profil créateur créé. Rôle CREATOR appliqué (JWT / guards).' };
    });
    await this.invalidateRbacCache(dto.userId);
    return result;
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
    await this.invalidateRbacCache(user.id);

    const base = this.config.get<string>('FRONTEND_URL') ?? '';
    const front = base.replace(/\/$/, '');
    const loginUrl = `${front}/auth/login`;
    const setupUrl = setupTokenPlain
      ? `${front}/auth/setup-password?token=${encodeURIComponent(setupTokenPlain)}`
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
        avatarObjectKey: dto.avatarObjectKey,
        bannerObjectKey: dto.bannerObjectKey,
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
      await this.replaceUserRbacRoleTx(tx, creator.userId, viewerRoleId);
    });
    await this.invalidateRbacCache(creator.userId);

    return { id, message: 'Créateur supprimé' };
  }

  async getMyProfile(userId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
        _count: { select: { contents: true } },
      },
    });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Compte créateur introuvable' });
    return creator;
  }

  async getMyContents(userId: string, page = 1, limit = 20, status?: string) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    const skip = (page - 1) * limit;
    const statusCode =
      status && status !== 'undefined' && status !== 'null' ? status.toUpperCase() : undefined;
    const where = {
      creatorId: creator.id,
      ...(statusCode && { status: { code: statusCode } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: {
          contentGenres: { include: { genre: { select: { code: true, label: true } } } },
          status: { select: { code: true, label: true } },
          contentType: { select: { code: true, label: true } },
          visibility: { select: { code: true, label: true } },
          maturityRating: { select: { code: true, label: true } },
          countryOfOrigin: { select: { isoCode: true, label: true } },
          originalLanguage: { select: { code: true, label: true } },
          mediaAssets: {
            where: { type: { code: { in: ['POSTER', 'THUMBNAIL'] } } },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            select: {
              objectKey: true,
              isPrimary: true,
              type: { select: { code: true } },
            },
          },
          videoAssets: {
            where: { episodeId: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, durationSec: true },
          },
          contentStats: {
            select: {
              totalViews: true,
              likeCount: true,
              commentCount: true,
              reviewCount: true,
              averageRating: true,
              favoriteCount: true,
            },
          },
          _count: { select: { episodes: true, seasons: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);
    const normalized = items.map((item: any) => {
      const poster =
        item.mediaAssets?.find((a: any) => a.type?.code === 'POSTER' && a.isPrimary) ??
        item.mediaAssets?.find((a: any) => a.type?.code === 'POSTER') ??
        item.mediaAssets?.find((a: any) => a.type?.code === 'THUMBNAIL' && a.isPrimary) ??
        item.mediaAssets?.find((a: any) => a.type?.code === 'THUMBNAIL');
      const {
        contentGenres,
        status: statusRef,
        contentType,
        visibility,
        maturityRating,
        countryOfOrigin,
        originalLanguage,
        mediaAssets: _ma,
        videoAssets,
        contentStats,
        _count,
        ...rest
      } = item;
      return {
        ...rest,
        status: statusRef?.code ?? null,
        statusLabel: statusRef?.label ?? null,
        contentType: contentType?.code ?? null,
        contentTypeLabel: contentType?.label ?? null,
        visibility: visibility?.code ?? null,
        visibilityLabel: visibility?.label ?? null,
        maturityRating: maturityRating?.code ?? null,
        maturityRatingLabel: maturityRating?.label ?? null,
        countryOfOrigin: countryOfOrigin?.isoCode ?? null,
        countryOfOriginLabel: countryOfOrigin?.label ?? null,
        originalLanguage: originalLanguage?.code ?? null,
        originalLanguageLabel: originalLanguage?.label ?? null,
        genres: contentGenres?.map((cg: any) => cg.genre) ?? [],
        posterObjectKey: poster?.objectKey ?? null,
        videoAssetId: videoAssets?.[0]?.id ?? null,
        videoStatus: videoAssets?.[0]?.status ?? null,
        videoDurationSec: videoAssets?.[0]?.durationSec ?? null,
        duration:
          rest.duration && rest.duration > 0
            ? rest.duration
            : videoAssets?.[0]?.durationSec && videoAssets[0].durationSec > 0
              ? videoAssets[0].durationSec
              : rest.duration,
        episodeCount: _count?.episodes ?? 0,
        seasonCount: _count?.seasons ?? 0,
        stats: contentStats
          ? {
              totalViews: Number(contentStats.totalViews ?? 0),
              likeCount: contentStats.likeCount ?? 0,
              commentCount: contentStats.commentCount ?? 0,
              reviewCount: contentStats.reviewCount ?? 0,
              averageRating: contentStats.averageRating ?? 0,
              favoriteCount: contentStats.favoriteCount ?? 0,
            }
          : null,
      };
    });

    for (let i = 0; i < normalized.length; i++) {
      const item = normalized[i];
      if (
        isSeriesType(item.contentType) &&
        (!item.duration || item.duration < 1)
      ) {
        const total = await this.contentDuration.recalculateSeriesDuration(item.id);
        if (total > 0) normalized[i].duration = total;
      } else if (!item.duration || item.duration < 1) {
        const refreshed = await this.contentDuration.refreshContentDuration(item.id);
        if (refreshed && refreshed > 0) normalized[i].duration = refreshed;
      }
    }

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
        profileId: true,
        contentId: true,
        watchedSeconds: true,
        percentage: true,
      },
    });

    // Métriques agrégées
    const totalViews = contents.reduce((sum, c) => sum + c.viewCount, 0);
    const uniqueViewerIds = new Set(watchRecords.map(w => w.profileId));
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

    const qoe = await this.playbackQoE.getCreatorQoESummary(creator.id, days);

    return {
      period,
      overview: {
        totalViews,
        uniqueViewers: uniqueViewerIds.size,
        watchTimeHours: Math.round(totalWatchSeconds / 3600),
        averageWatchPercentage: avgPercentage,
        newFollowers: creator.subscriberCount,
      },
      topContents,
      playbackQoE: qoe,
    };
  }
}
