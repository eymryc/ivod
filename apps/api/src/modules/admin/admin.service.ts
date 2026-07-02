import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/types';
import {
  PLAYABLE_VIDEO_STATUSES,
  canReadVideoAsset,
  isPlayableVideoStatus,
} from '../../common/constants/video-playback';

type VideoAssetRow = {
  id: string;
  status: string;
  height: number | null;
  durationSec: number | null;
  episodeId: string | null;
  manifestPath: string | null;
  sourceObjectKey: string | null;
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalCreators,
      totalContents,
      publishedContents,
      pendingContents,
      pendingReports,
      views7d,
      monthlyRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.creator.count(),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: { code: 'PUBLISHED' } } }),
      this.prisma.content.count({ where: { status: { code: 'PENDING_REVIEW' } } }),
      this.prisma.contentReport.count({ where: { status: { code: 'PENDING' } } }),
      this.prisma.contentView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.payment.aggregate({
        where: { status: { code: 'COMPLETED' }, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const viewRecords = await this.prisma.contentView.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });
    const dailyMap = new Map<string, number>();
    for (const v of viewRecords) {
      const key = v.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const weeklyViews: Array<{ date: string; views: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyViews.push({ date: key, views: dailyMap.get(key) ?? 0 });
    }

    // Un seul GROUP BY plutôt que 12 aggregate() séquentiels (l'ancienne
    // boucle faisait 12 allers-retours DB au lieu d'un seul).
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyRows = await this.prisma.$queryRaw<Array<{ month: Date; amount: bigint | number | null }>>`
      SELECT date_trunc('month', p."paidAt") AS month, SUM(p.amount) AS amount
      FROM payments p
      JOIN ref_payment_statuses s ON s.id = p."statusId"
      WHERE s.code = 'COMPLETED' AND p."paidAt" >= ${twelveMonthsAgo}
      GROUP BY date_trunc('month', p."paidAt")
    `;
    const revenueByMonthKey = new Map<string, number>();
    for (const row of monthlyRows) {
      const d = row.month instanceof Date ? row.month : new Date(row.month);
      revenueByMonthKey.set(`${d.getFullYear()}-${d.getMonth()}`, Number(row.amount ?? 0));
    }

    const monthlyRevenue12m: Array<{ month: string; amount: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyRevenue12m.push({
        month: start.toLocaleDateString('fr-CI', { month: 'short', year: '2-digit' }),
        amount: revenueByMonthKey.get(`${start.getFullYear()}-${start.getMonth()}`) ?? 0,
      });
    }

    return {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      creators: { total: totalCreators },
      contents: { total: totalContents, published: publishedContents, pending: pendingContents },
      pendingReports,
      views7d,
      monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      weeklyViews,
      monthlyRevenue12m,
    };
  }

  async listContents(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status: { code: status } } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: {
          creator: { select: { id: true, stageName: true, verified: true, userId: true } },
          uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          contentType: { select: { code: true, label: true } },
          status: { select: { code: true, label: true } },
          visibility: { select: { code: true, label: true } },
          maturityRating: { select: { code: true, label: true } },
          contentGenres: { include: { genre: { select: { code: true, label: true } } } },
          mediaAssets: {
            where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } }, isPrimary: true },
            take: 1,
            select: { objectKey: true, type: { select: { code: true } } },
          },
          videoAssets: {
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              status: true,
              height: true,
              durationSec: true,
              episodeId: true,
              manifestPath: true,
              sourceObjectKey: true,
            },
          },
          episodes: {
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
            take: 200,
            select: {
              id: true,
              seasonNumber: true,
              episodeNumber: true,
              title: true,
              rejectionReason: true,
              status: { select: { code: true, label: true } },
              videoAssets: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: {
                  id: true,
                  status: true,
                  height: true,
                  durationSec: true,
                  episodeId: true,
                  manifestPath: true,
                  sourceObjectKey: true,
                },
              },
            },
          },
          primaryRightsholder: { select: { id: true, displayName: true, type: { select: { code: true, label: true } } } },
          distributor: { select: { id: true, displayName: true } },
          _count: { select: { episodes: true, seasons: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);
    const mapped = items.map((row) => this.mapContentForAdminList(row));
    return { items: mapped, total, page, limit };
  }

  private mapEpisodeForAdmin(ep: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    rejectionReason?: string | null;
    status?: { code: string; label: string };
    videoAssets: VideoAssetRow[];
  }) {
    const assets = ep.videoAssets ?? [];
    const picked =
      assets.find((a) => isPlayableVideoStatus(a.status) && canReadVideoAsset(a)) ??
      assets.find((a) => canReadVideoAsset(a)) ??
      assets[0] ??
      null;
    return {
      id: ep.id,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      status: ep.status,
      rejectionReason: ep.rejectionReason ?? null,
      canPlayVideo: canReadVideoAsset(picked),
      videoStatus: picked?.status ?? null,
    };
  }

  private mapContentForAdminList(row: Record<string, unknown>) {
    const picked = this.pickPreviewVideo(row);
    const rawEpisodes =
      (row.episodes as Array<{
        id: string;
        seasonNumber: number;
        episodeNumber: number;
        title: string;
        rejectionReason?: string | null;
        status?: { code: string; label: string };
        videoAssets: VideoAssetRow[];
      }>) ?? [];
    const episodes = rawEpisodes.map((ep) => this.mapEpisodeForAdmin(ep));
    const { episodes: _episodes, videoAssets: _assets, ...rest } = row;
    return {
      ...rest,
      previewEpisodeId: picked?.episodeId ?? null,
      canPlayVideo: canReadVideoAsset(picked),
      episodes,
      publishedEpisodeCount: episodes.filter((e) => e.status?.code === 'PUBLISHED').length,
      videoAssets: picked
        ? [
            {
              id: picked.id,
              status: picked.status,
              height: picked.height,
              duration: picked.durationSec,
            },
          ]
        : [],
    };
  }

  private pickPreviewVideo(row: Record<string, unknown>): VideoAssetRow | null {
    const contentAssets = (row.videoAssets as VideoAssetRow[] | undefined) ?? [];
    const filmAssets = contentAssets.filter((a) => !a.episodeId);
    const playableFilm = filmAssets.find(
      (a) => isPlayableVideoStatus(a.status) && canReadVideoAsset(a),
    );
    if (playableFilm) return playableFilm;

    const episodeAssets: VideoAssetRow[] = [];
    for (const ep of (row.episodes as Array<{ id: string; videoAssets: VideoAssetRow[] }> | undefined) ?? []) {
      for (const a of ep.videoAssets ?? []) {
        episodeAssets.push({ ...a, episodeId: a.episodeId ?? ep.id });
      }
    }
    const playableEpisode = episodeAssets.find(
      (a) => isPlayableVideoStatus(a.status) && canReadVideoAsset(a),
    );
    if (playableEpisode) return playableEpisode;

    const readableFilm = filmAssets.find((a) => canReadVideoAsset(a));
    if (readableFilm) return readableFilm;
    const readableEpisode = episodeAssets.find((a) => canReadVideoAsset(a));
    if (readableEpisode) return readableEpisode;

    return filmAssets[0] ?? episodeAssets[0] ?? contentAssets[0] ?? null;
  }

  private isSeriesContentType(code: string): boolean {
    return code === 'SERIE' || code === 'WEB_SERIE';
  }

  async moderateContent(contentId: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentType: { select: { code: true } },
        videoAssets: {
          where: { status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
          take: 1,
          select: { id: true },
        },
        uploadedBy: { select: { email: true, firstName: true } },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const isSeries = this.isSeriesContentType(content.contentType.code);
    if (action === 'approve' && !isSeries && content.videoAssets.length === 0) {
      throw new BadRequestException({
        code: 'CONTENT_006',
        message: 'Le contenu doit avoir une vidéo encodée avant publication.',
      });
    }

    const newStatusCode = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
    const publishedAt = action === 'approve' ? new Date() : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.content.update({
        where: { id: contentId },
        data: {
          status: { connect: { code: newStatusCode } },
          ...(publishedAt && { publishedAt }),
          ...(action === 'reject' && {
            rejectionReason: rejectionReason?.trim() || 'Contenu non conforme aux règles de publication.',
          }),
          ...(action === 'approve' && { rejectionReason: null }),
        },
      });
      // Indexer pour la recherche si publié
      if (newStatusCode === 'PUBLISHED') {
        await tx.videoAsset.updateMany({
          where: {
            contentId,
            episodeId: null,
            status: { in: ['READY', 'READY_PREVIEW'] },
          },
          data: { status: 'PUBLISHED' },
        });

        const parts = [updated.title, updated.description ?? '', ...(updated.tags ?? [])].filter(Boolean);
        tx.searchIndex.upsert({
          where: { contentId },
          create: { contentId, indexedText: parts.join(' ').toLowerCase() },
          update: { indexedText: parts.join(' ').toLowerCase() },
        }).catch(() => {});
        tx.contentStats.upsert({ where: { contentId }, create: { contentId }, update: {} }).catch(() => {});
        tx.refModerationStatus.findUnique({ where: { code: 'DONE' }, select: { id: true } })
          .then((ref) => ref ? tx.moderationQueue.updateMany({ where: { contentId }, data: { statusId: ref.id } }) : null)
          .catch(() => {});
      }
      return updated;
    }).then(async (updated) => {
      const finalReason = action === 'reject'
        ? (rejectionReason?.trim() || 'Contenu non conforme aux règles de publication.')
        : undefined;

      if (content.uploadedBy?.email) {
        this.mail.sendContentModerationEmail({
          to: content.uploadedBy.email,
          creatorFirstName: content.uploadedBy.firstName ?? content.uploadedBy.email,
          contentTitle: content.title,
          contentType: 'content',
          action,
          rejectionReason: finalReason,
        }).catch((err: Error) => this.logger.error('Erreur email modération contenu', err.message));
      }

      if (content.uploadedByUserId) {
        const notifType = action === 'approve' ? NotificationType.CONTENT_APPROVED : NotificationType.CONTENT_REJECTED;
        this.notifications.dispatch({
          userId: content.uploadedByUserId,
          type: notifType,
          title: action === 'approve' ? 'Contenu publié ✓' : 'Contenu rejeté',
          body: action === 'approve'
            ? `« ${content.title} » a été approuvé et est maintenant publié.`
            : `« ${content.title} » a été rejeté : ${finalReason}`,
          data: { contentId: contentId, contentTitle: content.title, rejectionReason: finalReason },
        }).catch((err: Error) => this.logger.error('Erreur dispatch notification modération', err.message));

        // Fan-out NEW_CONTENT to all followers of the creator
        if (action === 'approve') {
          this.prisma.creator.findFirst({
            where: { userId: content.uploadedByUserId },
            select: { id: true },
          }).then(async (creator) => {
            if (!creator) return;
            const follows = await this.prisma.follow.findMany({
              where: { creatorId: creator.id },
              select: { followerId: true },
              take: 1000,
            });
            for (const f of follows) {
              await this.notifications.dispatch({
                userId: f.followerId,
                type: NotificationType.NEW_CONTENT,
                title: 'Nouveau contenu disponible',
                body: `« ${content.title} » est maintenant disponible.`,
                data: { contentId, creatorId: content.uploadedByUserId! },
              }).catch(() => {});
            }
          }).catch((err: Error) => this.logger.error('Erreur fan-out NEW_CONTENT', err.message));
        }
      }

      return updated;
    });
  }

  async moderateEpisode(episodeId: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        videoAssets: {
          where: { status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
          take: 1,
          select: { id: true },
        },
        content: {
          select: {
            id: true,
            title: true,
            uploadedByUserId: true,
            uploadedBy: { select: { email: true, firstName: true } },
          },
        },
      },
    });
    if (!episode) throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });

    if (action === 'approve' && episode.videoAssets.length === 0) {
      throw new BadRequestException({
        code: 'CONTENT_006',
        message: "L'épisode doit avoir une vidéo encodée avant publication.",
      });
    }

    const newStatusCode = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
    const publishedAt = action === 'approve' ? new Date() : undefined;

    if (action === 'approve') {
      await this.prisma.videoAsset.updateMany({
        where: {
          episodeId,
          status: { in: ['READY', 'READY_PREVIEW'] },
        },
        data: { status: 'PUBLISHED' },
      });
    }

    return this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        status: { connect: { code: newStatusCode } },
        ...(publishedAt && { publishedAt }),
        ...(action === 'reject' && {
          rejectionReason:
            rejectionReason?.trim() || 'Épisode non conforme aux règles de publication.',
        }),
        ...(action === 'approve' && { rejectionReason: null }),
      },
      include: { status: { select: { code: true, label: true } } },
    }).then(async (updated) => {
      const uploader = episode.content?.uploadedBy;
      const contentTitle = episode.content?.title ?? 'Épisode';
      const finalReason = action === 'reject'
        ? (rejectionReason?.trim() || 'Épisode non conforme aux règles de publication.')
        : undefined;

      if (uploader?.email) {
        this.mail.sendContentModerationEmail({
          to: uploader.email,
          creatorFirstName: uploader.firstName ?? uploader.email,
          contentTitle,
          contentType: 'episode',
          action,
          rejectionReason: finalReason,
        }).catch((err: Error) => this.logger.error('Erreur email modération épisode', err.message));
      }

      if (episode.content?.uploadedByUserId) {
        const notifType = action === 'approve' ? NotificationType.CONTENT_APPROVED : NotificationType.CONTENT_REJECTED;
        this.notifications.dispatch({
          userId: episode.content.uploadedByUserId,
          type: notifType,
          title: action === 'approve' ? 'Épisode publié' : 'Épisode rejeté',
          body: action === 'approve'
            ? `Un épisode de « ${contentTitle} » a été approuvé.`
            : `Un épisode de « ${contentTitle} » a été rejeté : ${finalReason}`,
          data: { contentId: episode.content.id, contentTitle, rejectionReason: finalReason },
        }).catch((err: Error) => this.logger.error('Erreur dispatch notification modération épisode', err.message));
      }

      return updated;
    });
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          userRoles: { include: { role: { select: { code: true } } } },
          userSubscriptions: {
            where: { status: { code: 'ACTIVE' } },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { plan: { select: { code: true, label: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    const normalized = items.map(({ userRoles, userSubscriptions, ...u }) => ({
      ...u,
      role: userRoles[0]?.role?.code ?? 'VIEWER',
      plan: userSubscriptions[0]?.plan?.code ?? 'FREE',
      planLabel: userSubscriptions[0]?.plan?.label ?? 'Gratuit',
    }));
    return { items: normalized, total, page, limit };
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, firstName: true, isActive: true },
    });
    this.mail.sendAccountStatusEmail(
      updated.email,
      updated.firstName ?? updated.email,
      updated.isActive,
    ).catch((err: Error) => this.logger.error('Erreur email statut compte', err.message));

    const notifType = updated.isActive ? NotificationType.ACCOUNT_REACTIVATED : NotificationType.ACCOUNT_SUSPENDED;
    this.notifications.dispatch({
      userId: updated.id,
      type: notifType,
      title: updated.isActive ? 'Compte réactivé' : 'Compte suspendu',
      body: updated.isActive
        ? 'Votre compte a été réactivé. Vous pouvez à nouveau vous connecter.'
        : 'Votre compte a été suspendu. Contactez le support pour plus d\'informations.',
      data: { isActive: updated.isActive },
    }).catch((err: Error) => this.logger.error('Erreur notification statut compte', err.message));

    return updated;
  }

  async verifyCreator(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: { user: { select: { email: true, firstName: true } } },
    });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });
    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: { verified: !creator.verified },
      select: { id: true, stageName: true, verified: true },
    });
    if (creator.user?.email) {
      this.mail.sendCreatorVerifiedEmail(
        creator.user.email,
        creator.user.firstName ?? creator.user.email,
        creator.stageName,
        updated.verified,
      ).catch((err: Error) => this.logger.error('Erreur email vérification créateur', err.message));
    }

    const creatorUser = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { userId: true },
    });
    if (creatorUser?.userId) {
      this.notifications.dispatch({
        userId: creatorUser.userId,
        type: NotificationType.CREATOR_VERIFIED,
        title: updated.verified ? 'Badge vérifié obtenu ✓' : 'Badge vérifié retiré',
        body: updated.verified
          ? 'Félicitations ! Votre chaîne a été vérifiée par l\'équipe iVOD.'
          : 'Le badge de vérification de votre chaîne a été retiré.',
        data: { verified: updated.verified, stageName: updated.stageName },
      }).catch((err: Error) => this.logger.error('Erreur notification vérification créateur', err.message));
    }

    return updated;
  }
}
