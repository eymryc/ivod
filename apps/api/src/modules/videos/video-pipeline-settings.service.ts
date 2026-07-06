import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as os from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { RENDITION_PROFILES } from './video-pipeline.constants';

export interface EffectivePipelineSettings {
  detectedCpuLimit: number;
  maxQualityCode: string;
  maxQualityCodeByPlan: Record<string, string> | null;
  workerConcurrency: number;
  workerConcurrencyIsOverride: boolean;
  /** Toujours dérivé de detectedCpuLimit ÷ workerConcurrency — jamais réglable indépendamment (voir note 2026-07-03 plus bas). */
  ffmpegThreads: number;
  recommendedConcurrency: number;
  recommendedThreads: number;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/**
 * Détection des ressources réellement allouées au conteneur + paramètres du
 * pipeline vidéo, modifiables depuis l'admin sans redéploiement (contrairement
 * aux variables d'environnement Docker VIDEO_WORKER_CONCURRENCY /
 * VIDEO_FFMPEG_THREADS d'origine, qui nécessitent d'éditer .env + redéployer).
 *
 * Découverte du 2026-07-03 à l'origine de ce service : VIDEO_WORKER_CONCURRENCY=2
 * × VIDEO_FFMPEG_THREADS=4 réclame jusqu'à 8 threads sur un conteneur limité à
 * 4 CPU — sur-souscription silencieuse, jamais alignée sur la vraie limite.
 *
 * Deuxième correctif le même jour : concurrency et threads étaient réglables
 * indépendamment en admin — un admin qui ne changeait que la concurrency
 * pouvait recréer exactement cette même sur-souscription sans le savoir.
 * `ffmpegThreads` est désormais TOUJOURS dérivé de la concurrency effective
 * (CPU détecté ÷ concurrency) — plus aucun réglage indépendant possible,
 * la sur-souscription est éliminée par construction plutôt que détectée a
 * posteriori par le bandeau d'alerte de l'admin.
 */
@Injectable()
export class VideoPipelineSettingsService {
  private readonly logger = new Logger(VideoPipelineSettingsService.name);
  private cachedCpuLimit: number | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Limite CPU réelle du conteneur : cgroup v2 (cpu.max), puis v1
   * (cpu.cfs_quota_us / cpu.cfs_period_us), repli sur les CPU logiques de
   * l'hôte si aucune limite cgroup n'est lisible (dev local, non containerisé).
   */
  detectCpuLimit(): number {
    if (this.cachedCpuLimit !== null) return this.cachedCpuLimit;

    let detected: number | null = null;
    try {
      const raw = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
      const [quota, period] = raw.split(' ');
      if (quota !== 'max') {
        const q = parseInt(quota!, 10);
        const p = parseInt(period!, 10);
        if (q > 0 && p > 0) detected = q / p;
      }
    } catch {
      /* pas cgroup v2 (ou pas de limite posée) — on tente v1 ci-dessous */
    }

    if (detected === null) {
      try {
        const quotaRaw = fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim();
        const periodRaw = fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim();
        const q = parseInt(quotaRaw, 10);
        const p = parseInt(periodRaw, 10);
        if (q > 0 && p > 0) detected = q / p;
      } catch {
        /* pas cgroup v1 non plus */
      }
    }

    this.cachedCpuLimit =
      detected !== null && detected > 0
        ? Math.max(1, Math.round(detected * 10) / 10)
        : os.cpus().length;
    this.logger.log(`CPU détecté pour ce conteneur : ${this.cachedCpuLimit}`);
    return this.cachedCpuLimit;
  }

  /**
   * Le ladder single-pass (défaut, voir isSinglePassLadderEnabled) extrait déjà
   * du parallélisme interne via filter_complex pour toutes les qualités d'un
   * même job — privilégier 1 job à la fois avec tous les threads disponibles
   * plutôt que plusieurs jobs qui se disputent le CPU est donc le choix sûr
   * tant que la limite reste modeste. Au-delà de 5 CPU, 2 jobs simultanés
   * avec la moitié des threads chacun reste dans la limite réelle.
   */
  private recommend(cpuLimit: number): { concurrency: number; threads: number } {
    if (cpuLimit <= 5) {
      return { concurrency: 1, threads: Math.max(1, Math.floor(cpuLimit)) };
    }
    const concurrency = 2;
    return { concurrency, threads: Math.max(1, Math.floor(cpuLimit / concurrency)) };
  }

  /**
   * Détection + persistance en base — à appeler côté worker uniquement
   * (VideoPipelineProcessor.applyPipelineSettings). Le worker et l'API sont
   * deux conteneurs Docker distincts avec des limites CPU différentes (2 vs
   * 4 sur ce serveur) ; seule la détection du worker (celui qui encode
   * réellement) doit faire foi pour la recommandation affichée en admin.
   */
  async applyAndPersistDetection(): Promise<EffectivePipelineSettings> {
    const cpuLimit = this.detectCpuLimit();
    await this.prisma.videoPipelineSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', lastDetectedCpuLimit: cpuLimit, lastAppliedAt: new Date() },
      update: { lastDetectedCpuLimit: cpuLimit, lastAppliedAt: new Date() },
    });
    return this.getEffectiveSettings();
  }

  async getEffectiveSettings(): Promise<EffectivePipelineSettings> {
    const row = await this.prisma.videoPipelineSettings.findUnique({ where: { id: 'default' } });
    // Préfère la dernière détection rapportée par le worker ; ne retombe sur
    // une détection locale (potentiellement celle du conteneur API) que si
    // aucun worker n'a encore tourné depuis la mise en place de ce réglage.
    const cpuLimit = row?.lastDetectedCpuLimit ?? this.detectCpuLimit();
    const recommendation = this.recommend(cpuLimit);

    const concurrencyOverride = row?.workerConcurrencyOverride ?? null;
    const workerConcurrency = concurrencyOverride ?? recommendation.concurrency;
    // Jamais un réglage indépendant : recalculé à partir de la concurrency
    // effective (surchargée ou non), garantissant concurrency × threads ≤ CPU.
    const ffmpegThreads = Math.max(1, Math.floor(cpuLimit / workerConcurrency));

    return {
      detectedCpuLimit: cpuLimit,
      maxQualityCode: row?.maxQualityCode ?? '1080p',
      maxQualityCodeByPlan: (row?.maxQualityCodeByPlan as Record<string, string> | null) ?? null,
      workerConcurrency,
      workerConcurrencyIsOverride: concurrencyOverride !== null,
      ffmpegThreads,
      recommendedConcurrency: recommendation.concurrency,
      recommendedThreads: recommendation.threads,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }

  /** Hauteur de coupure de la ladder pour un code qualité ("1080p" → 1080). */
  qualityCodeToHeight(code: string): number {
    const profile = RENDITION_PROFILES.find((p) => p.name === code);
    return profile?.height ?? RENDITION_PROFILES[RENDITION_PROFILES.length - 1]!.height;
  }

  /**
   * Plafond de qualité effectif pour un asset : maxQualityCodeByPlan[plan du
   * créateur] si défini, sinon maxQualityCode global. Partagé entre le
   * worker (décide quelles renditions encoder) et l'API (calcule la liste
   * "attendue" affichée dans /videos/:id/status) — sans ce partage, le
   * statut affichait toujours l'ancienne ladder complète (jusqu'à 2160p)
   * même une fois le plafond appliqué côté encodage, laissant deux badges
   * "en cours" qui ne se terminaient jamais. Trouvé le 2026-07-03.
   */
  async resolveMaxQualityHeightForAsset(assetId: string): Promise<number> {
    const settings = await this.getEffectiveSettings();
    let qualityCode = settings.maxQualityCode;

    if (settings.maxQualityCodeByPlan && Object.keys(settings.maxQualityCodeByPlan).length > 0) {
      const asset = await this.prisma.videoAsset.findUnique({
        where: { id: assetId },
        select: { content: { select: { creator: { select: { userId: true } } } } },
      });
      const creatorUserId = asset?.content.creator.userId;
      if (creatorUserId) {
        const activeSub = await this.prisma.userSubscription.findFirst({
          where: { userId: creatorUserId, status: { code: 'ACTIVE' } },
          include: { plan: { select: { code: true } } },
          orderBy: { createdAt: 'desc' },
        });
        const planCode = (activeSub?.plan as { code: string } | undefined)?.code;
        if (planCode && settings.maxQualityCodeByPlan[planCode]) {
          qualityCode = settings.maxQualityCodeByPlan[planCode]!;
        }
      }
    }

    return this.qualityCodeToHeight(qualityCode);
  }

  async updateSettings(
    input: {
      maxQualityCode?: string;
      maxQualityCodeByPlan?: Record<string, string> | null;
      workerConcurrencyOverride?: number | null;
    },
    updatedBy: string,
  ): Promise<EffectivePipelineSettings> {
    // Prisma exige le sentinel Prisma.JsonNull pour explicitement mettre un
    // champ JSON à null (un simple `null` JS est ambigu avec "ne pas toucher").
    const byPlan =
      input.maxQualityCodeByPlan === null
        ? Prisma.JsonNull
        : (input.maxQualityCodeByPlan ?? undefined);

    // ffmpegThreadsOverride (colonne encore présente en base, migration
    // 20260703112240) n'est plus jamais écrit depuis le 2026-07-03 — les
    // threads sont désormais toujours dérivés de la concurrency effective
    // (voir getEffectiveSettings). Colonne laissée en place pour éviter une
    // migration destructive ; ignorée par le code.
    await this.prisma.videoPipelineSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        maxQualityCode: input.maxQualityCode ?? '1080p',
        maxQualityCodeByPlan: byPlan,
        workerConcurrencyOverride: input.workerConcurrencyOverride ?? null,
        updatedBy,
      },
      update: {
        ...(input.maxQualityCode !== undefined ? { maxQualityCode: input.maxQualityCode } : {}),
        ...(input.maxQualityCodeByPlan !== undefined ? { maxQualityCodeByPlan: byPlan } : {}),
        ...(input.workerConcurrencyOverride !== undefined
          ? { workerConcurrencyOverride: input.workerConcurrencyOverride }
          : {}),
        updatedBy,
      },
    });
    return this.getEffectiveSettings();
  }
}
