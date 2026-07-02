import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { resolveContentImageKeys } from '../../common/helpers/content-media.helper';
import { buildResumePreview } from '../../common/helpers/resume-preview.helper';
import { resolveProfileId } from '../../common/helpers/profile.helper';

export interface StartSessionDto {
  contentId: string;
  episodeId?: string;
  deviceFingerprint?: string;
  quality?: string;
  profileId?: string;
}

export interface HeartbeatDto {
  currentPositionSec: number;
  quality?: string;
}

@Injectable()
export class WatchSessionsService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async getDefaultProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    return profile.id;
  }

  private async getDeviceId(userId: string, fingerprint?: string): Promise<string | null> {
    if (!fingerprint) return null;
    const device = await this.prisma.device.findFirst({
      where: { userId, fingerprint },
      select: { id: true },
    });
    return device?.id ?? null;
  }

  private async getMaxScreens(userId: string): Promise<number> {
    const activeSub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { currentPeriodEnd: 'desc' },
      include: { plan: { select: { maxScreens: true } } },
    });
    return activeSub?.plan?.maxScreens ?? 1;
  }

  private async countActiveScreens(userId: string, excludeSessionId?: string): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return this.prisma.watchSession.count({
      where: {
        profile: { userId },
        isActive: true,
        lastHeartbeatAt: { gte: tenMinutesAgo },
        ...(excludeSessionId && { id: { not: excludeSessionId } }),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Démarrer une session
  // ─────────────────────────────────────────────────────────────────────────

  async startSession(userId: string, dto: StartSessionDto) {
    const profileId = await resolveProfileId(this.prisma, userId, dto.profileId);
    const deviceId = await this.getDeviceId(userId, dto.deviceFingerprint);

    // Vérifier la limite d'écrans simultanés
    const maxScreens = await this.getMaxScreens(userId);
    const activeScreens = await this.countActiveScreens(userId);
    if (activeScreens >= maxScreens) {
      throw new ForbiddenException({
        code: 'WATCH_001',
        message: `Limite d'écrans atteinte (${maxScreens} écran${maxScreens > 1 ? 's' : ''} simultané${maxScreens > 1 ? 's' : ''} autorisé${maxScreens > 1 ? 's' : ''}).`,
        maxScreens,
        activeScreens,
      });
    }


    // Contrôle parental
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { parentalControl: true, maturityRating: { select: { order: true, code: true } } },
    });
    if (profile?.isKids || profile?.parentalControl) {
      const content = await this.prisma.content.findUnique({
        where: { id: dto.contentId },
        include: { maturityRating: { select: { order: true, code: true } } },
      });
      const contentRatingOrder = (content as any)?.maturityRating?.order ?? 0;
      const maxMaturityRatingId = profile?.parentalControl?.maxMaturityRatingId;
      const maxRating = maxMaturityRatingId
        ? await this.prisma.refMaturityRating.findUnique({ where: { id: maxMaturityRatingId }, select: { order: true } })
        : await this.prisma.refMaturityRating.findUnique({ where: { code: 'ALL' }, select: { order: true } });
      const maxOrder = maxRating?.order ?? 0;
      if (contentRatingOrder > maxOrder) {
        throw new ForbiddenException({ code: 'PARENTAL_001', message: 'Contenu non autorisé pour ce profil (contrôle parental)' });
      }
      // Vérification des horaires restreints
      const ctrl = profile?.parentalControl;
      if (ctrl?.restrictedHoursStart != null && ctrl?.restrictedHoursEnd != null) {
        const currentHour = new Date().getHours();
        const blocked = ctrl.restrictedHoursStart < ctrl.restrictedHoursEnd
          ? currentHour >= ctrl.restrictedHoursStart && currentHour < ctrl.restrictedHoursEnd
          : currentHour >= ctrl.restrictedHoursStart || currentHour < ctrl.restrictedHoursEnd;
        if (blocked) throw new ForbiddenException({ code: 'PARENTAL_002', message: 'Accès restreint à cet horaire (contrôle parental)' });
      }
    }
    // Clore les sessions précédentes sur le même contenu/profil
    await this.prisma.watchSession.updateMany({
      where: { profileId, contentId: dto.contentId, episodeId: dto.episodeId ?? null, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    // Récupérer la progression existante
    const existingHistory = await this.prisma.watchHistory.findFirst({
      where: { profileId, contentId: dto.contentId, episodeId: dto.episodeId ?? null },
      select: { watchedSeconds: true },
    });

    const session = await this.prisma.watchSession.create({
      data: {
        profileId,
        contentId: dto.contentId,
        episodeId: dto.episodeId ?? null,
        deviceId,
        currentPositionSec: existingHistory?.watchedSeconds ?? 0,
        qualitySelected: dto.quality ?? 'auto',
        isActive: true,
      },
    });

    await this.recordContentView({
      profileId,
      contentId: dto.contentId,
      episodeId: dto.episodeId ?? null,
      deviceId,
      startedAt: session.startedAt,
      watchTimeSeconds: existingHistory?.watchedSeconds ?? 0,
      completionPct: 0,
    });

    return {
      sessionId: session.id,
      resumePositionSec: session.currentPositionSec,
      quality: session.qualitySelected,
      maxScreens,
      activeScreens: activeScreens + 1,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Heartbeat (toutes les 30s depuis le player)
  // ─────────────────────────────────────────────────────────────────────────

  async heartbeat(userId: string, sessionId: string, dto: HeartbeatDto) {
    const session = await this.prisma.watchSession.findFirst({
      where: { id: sessionId, profile: { userId }, isActive: true },
      select: {
        id: true,
        profileId: true,
        contentId: true,
        episodeId: true,
        startedAt: true,
        deviceId: true,
      },
    });
    if (!session) throw new NotFoundException({ code: 'WATCH_002', message: 'Session introuvable ou expirée' });

    const now = new Date();
    const pos = Math.max(0, Math.floor(Number(dto.currentPositionSec) || 0));

    await this.prisma.watchSession.update({
      where: { id: sessionId },
      data: { currentPositionSec: pos, lastHeartbeatAt: now, ...(dto.quality && { qualitySelected: dto.quality }) },
    });

    const { percentage, completed } = await this.resolveWatchProgress(
      session.contentId,
      session.episodeId,
      pos,
    );

    const episodeKey = session.episodeId ?? null;

    await this.upsertWatchHistory({
      profileId: session.profileId,
      contentId: session.contentId,
      episodeId: episodeKey,
      watchedSeconds: pos,
      percentage,
      completed,
      lastWatchedAt: now,
    });

    await this.syncContentViewForSession(session, pos, percentage);

    return { ok: true, positionSec: pos };
  }

  private async resolveWatchProgress(
    contentId: string,
    episodeId: string | null,
    positionSec: number,
  ): Promise<{ percentage: number; completed: boolean }> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { duration: true },
    });
    let duration = content?.duration ?? 1;
    if (episodeId) {
      const ep = await this.prisma.episode.findUnique({
        where: { id: episodeId },
        select: { duration: true },
      });
      if (ep?.duration) duration = ep.duration;
    }
    const percentage = Math.min((positionSec / Math.max(duration, 1)) * 100, 100);
    return { percentage, completed: percentage >= 90 };
  }

  /** Enregistre une vue studio (analytics) liée à la session en cours */
  private async recordContentView(data: {
    profileId: string;
    contentId: string;
    episodeId: string | null;
    deviceId: string | null;
    startedAt: Date;
    watchTimeSeconds: number;
    completionPct: number;
  }) {
    await this.prisma.contentView.create({
      data: {
        profileId: data.profileId,
        contentId: data.contentId,
        episodeId: data.episodeId,
        deviceId: data.deviceId,
        watchTimeSeconds: data.watchTimeSeconds,
        completionPct: data.completionPct,
      },
    });
    await this.analytics.refreshContentStats(data.contentId).catch(() => {});
  }

  private async syncContentViewForSession(
    session: {
      profileId: string;
      contentId: string;
      episodeId: string | null;
      startedAt: Date;
      deviceId: string | null;
    },
    watchTimeSeconds: number,
    completionPct: number,
  ) {
    const view = await this.prisma.contentView.findFirst({
      where: {
        profileId: session.profileId,
        contentId: session.contentId,
        episodeId: session.episodeId,
        createdAt: { gte: session.startedAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!view) {
      await this.recordContentView({
        profileId: session.profileId,
        contentId: session.contentId,
        episodeId: session.episodeId,
        deviceId: session.deviceId,
        startedAt: session.startedAt,
        watchTimeSeconds,
        completionPct,
      });
      return;
    }
    await this.prisma.contentView.update({
      where: { id: view.id },
      data: {
        watchTimeSeconds: Math.max(view.watchTimeSeconds, watchTimeSeconds),
        completionPct: Math.max(view.completionPct, completionPct),
      },
    });
  }

  /** Upsert historique compatible episodeId null (films) */
  private async upsertWatchHistory(data: {
    profileId: string;
    contentId: string;
    episodeId: string | null;
    watchedSeconds: number;
    percentage: number;
    completed: boolean;
    lastWatchedAt: Date;
  }) {
    const existing = await this.prisma.watchHistory.findFirst({
      where: {
        profileId: data.profileId,
        contentId: data.contentId,
        episodeId: data.episodeId,
      },
    });

    if (existing) {
      await this.prisma.watchHistory.update({
        where: { id: existing.id },
        data: {
          watchedSeconds: Math.max(existing.watchedSeconds, data.watchedSeconds),
          percentage: data.percentage,
          completed: data.completed,
          lastWatchedAt: data.lastWatchedAt,
        },
      });
      return;
    }

    await this.prisma.watchHistory.create({
      data: {
        profileId: data.profileId,
        contentId: data.contentId,
        episodeId: data.episodeId,
        watchedSeconds: data.watchedSeconds,
        percentage: data.percentage,
        completed: data.completed,
        lastWatchedAt: data.lastWatchedAt,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Terminer une session
  // ─────────────────────────────────────────────────────────────────────────

  async endSession(userId: string, sessionId: string, finalPositionSec?: number) {
    const session = await this.prisma.watchSession.findFirst({
      where: { id: sessionId, profile: { userId } },
      select: { id: true, profileId: true, contentId: true, episodeId: true, isActive: true },
    });
    if (!session) throw new NotFoundException({ code: 'WATCH_002', message: 'Session introuvable' });

    const now = new Date();
    await this.prisma.watchSession.update({
      where: { id: sessionId },
      data: { isActive: false, endedAt: now, ...(finalPositionSec != null && { currentPositionSec: finalPositionSec }) },
    });

    if (finalPositionSec != null) {
      const pos = Math.max(0, Math.floor(Number(finalPositionSec) || 0));
      const { percentage, completed } = await this.resolveWatchProgress(
        session.contentId,
        session.episodeId,
        pos,
      );

      await this.upsertWatchHistory({
        profileId: session.profileId,
        contentId: session.contentId,
        episodeId: session.episodeId ?? null,
        watchedSeconds: pos,
        percentage,
        completed,
        lastWatchedAt: now,
      });

      const fullSession = await this.prisma.watchSession.findUnique({
        where: { id: sessionId },
        select: {
          profileId: true,
          contentId: true,
          episodeId: true,
          startedAt: true,
          deviceId: true,
        },
      });
      if (fullSession) {
        await this.syncContentViewForSession(fullSession, pos, percentage);
        await this.analytics.refreshContentStats(fullSession.contentId).catch(() => {});
      }
    }

    return { message: 'Session terminée', sessionId };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sessions actives de l'utilisateur
  // ─────────────────────────────────────────────────────────────────────────

  async getActiveSessions(userId: string) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sessions = await this.prisma.watchSession.findMany({
      where: { profile: { userId }, isActive: true, lastHeartbeatAt: { gte: tenMinutesAgo } },
      include: {
        content: { select: { id: true, title: true, slug: true } },
        device: { select: { deviceType: true, deviceName: true } },
      },
      orderBy: { lastHeartbeatAt: 'desc' },
    });
    return { count: sessions.length, sessions };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Clore toutes les sessions (déconnexion globale)
  // ─────────────────────────────────────────────────────────────────────────

  async terminateAllSessions(userId: string, exceptSessionId?: string) {
    await this.prisma.watchSession.updateMany({
      where: {
        profile: { userId },
        isActive: true,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { isActive: false, endedAt: new Date() },
    });
    return { message: 'Toutes les sessions ont été terminées' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Historique de visionnage
  // ─────────────────────────────────────────────────────────────────────────

  async getHistory(userId: string, page = 1, limit = 20) {
    const profileId = await this.getDefaultProfileId(userId);
    return this.getHistoryForProfile(userId, profileId, page, limit);
  }

  private mapHistoryContent(
    content: {
      id: string;
      title: string;
      slug: string;
      mediaAssets?: Array<{ objectKey: string; type?: { code: string } | null; isPrimary?: boolean }>;
      videoAssets?: Array<{ posterObjectKey: string | null }>;
    },
    episode?: {
      thumbnailObjectKey?: string | null;
      videoAssets?: Array<{ posterObjectKey: string | null }>;
    } | null,
  ) {
    const assets = content.mediaAssets ?? [];
    const videoPoster =
      episode?.videoAssets?.[0]?.posterObjectKey ??
      content.videoAssets?.[0]?.posterObjectKey ??
      null;
    const images = resolveContentImageKeys(assets, videoPoster);

    let posterObjectKey = images.posterObjectKey;
    let thumbnailObjectKey = images.thumbnailObjectKey;
    if (episode?.thumbnailObjectKey) {
      thumbnailObjectKey = episode.thumbnailObjectKey;
      if (!posterObjectKey) posterObjectKey = episode.thumbnailObjectKey;
    }

    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      posterObjectKey,
      thumbnailObjectKey,
      videoPosterObjectKey: images.videoPosterObjectKey,
      mediaAssets: assets.map((a) => ({
        objectKey: a.objectKey,
        type: { code: a.type?.code ?? '' },
        isPrimary: a.isPrimary ?? false,
      })),
    };
  }

  // userId : IDOR — sans ce filtre, n'importe quel utilisateur connecté
  // pouvait lire l'historique de visionnage d'un profil appartenant à un
  // autre compte en devinant/obtenant son profileId (GET
  // /watch-sessions/history/profile/:profileId ne vérifiait aucune
  // propriété avant ce correctif).
  async getHistoryForProfile(userId: string, profileId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watchHistory.findMany({
        where: { profileId, profile: { userId } },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              mediaAssets: {
                where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } } },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                select: { objectKey: true, type: { select: { code: true } }, isPrimary: true },
              },
              duration: true,
              videoAssets: {
                where: { episodeId: null, status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  posterObjectKey: true,
                  storyboardSpriteKey: true,
                  durationSec: true,
                },
              },
            },
          },
          episode: {
            select: {
              id: true,
              title: true,
              episodeNumber: true,
              seasonNumber: true,
              thumbnailObjectKey: true,
              videoAssets: {
                where: { status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  posterObjectKey: true,
                  storyboardSpriteKey: true,
                  durationSec: true,
                },
              },
            },
          },
        },
        orderBy: { lastWatchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { profileId, profile: { userId } } }),
    ]);

    const mapped = rows.map((row) => {
      const episodeAsset = row.episode?.videoAssets?.[0];
      const contentAsset = row.content.videoAssets?.[0];
      const videoAsset = episodeAsset ?? contentAsset;
      const durationSec =
        videoAsset?.durationSec ??
        (row.episode ? null : row.content.duration) ??
        null;
      const resumePreview = buildResumePreview(
        row.watchedSeconds,
        videoAsset?.storyboardSpriteKey,
        durationSec,
      );

      return {
        id: row.id,
        profileId: row.profileId,
        contentId: row.contentId,
        episodeId: row.episodeId,
        watchedSeconds: row.watchedSeconds,
        percentage: row.percentage,
        completed: row.completed,
        lastWatchedAt: row.lastWatchedAt,
        resumePreview,
        content: this.mapHistoryContent(row.content, row.episode),
        episode: row.episode,
      };
    });

    const items = this.dedupeWatchHistory(mapped);

    return { items, total, page, limit };
  }

  /**
   * PostgreSQL : UNIQUE(profileId, contentId, episodeId) autorise plusieurs lignes
   * quand episodeId est NULL — on garde la plus récente par contenu (+ épisode).
   */
  private dedupeWatchHistory<
    T extends { contentId: string; episodeId: string | null; lastWatchedAt: Date },
  >(rows: T[]): T[] {
    const byKey = new Map<string, T>();
    for (const row of rows) {
      const key = `${row.contentId}:${row.episodeId ?? ''}`;
      const prev = byKey.get(key);
      if (!prev || row.lastWatchedAt > prev.lastWatchedAt) byKey.set(key, row);
    }
    return Array.from(byKey.values()).sort(
      (a, b) => b.lastWatchedAt.getTime() - a.lastWatchedAt.getTime(),
    );
  }

  async clearHistory(userId: string) {
    const profileId = await this.getDefaultProfileId(userId);
    const result = await this.prisma.watchHistory.deleteMany({ where: { profileId } });
    return { deleted: result.count };
  }
}
