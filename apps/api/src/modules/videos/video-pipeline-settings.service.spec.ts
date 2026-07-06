import * as fs from 'fs';
import * as os from 'os';
import { VideoPipelineSettingsService } from './video-pipeline-settings.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('fs');
jest.mock('os');

const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockedCpus = os.cpus as jest.MockedFunction<typeof os.cpus>;

/** Pas de cgroup lisible (dev local hors conteneur) → repli sur N CPU logiques. */
function mockNoCgroup(logicalCpus: number) {
  mockedReadFileSync.mockImplementation(() => {
    throw new Error('ENOENT');
  });
  mockedCpus.mockReturnValue(new Array(logicalCpus).fill({}) as os.CpuInfo[]);
}

/**
 * Mock minimal de PrismaService — seules les méthodes réellement appelées
 * par VideoPipelineSettingsService sont fournies. Pas de base réelle (voir
 * décision du 2026-07-03 : mocks Prisma d'abord, intégration plus tard).
 */
function createPrismaMock() {
  return {
    videoPipelineSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    videoAsset: {
      findUnique: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService & {
    videoPipelineSettings: { findUnique: jest.Mock; upsert: jest.Mock };
    videoAsset: { findUnique: jest.Mock };
    userSubscription: { findFirst: jest.Mock };
  };
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'default',
    maxQualityCode: '1080p',
    maxQualityCodeByPlan: null,
    workerConcurrencyOverride: null,
    ffmpegThreadsOverride: null,
    lastDetectedCpuLimit: null,
    lastAppliedAt: null,
    updatedAt: new Date('2026-07-03T00:00:00Z'),
    updatedBy: null,
    ...overrides,
  };
}

describe('VideoPipelineSettingsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: VideoPipelineSettingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma = createPrismaMock();
    service = new VideoPipelineSettingsService(prisma);
  });

  describe('detectCpuLimit', () => {
    it('lit la limite cgroup v2 (cpu.max) quand elle est posée', () => {
      mockedReadFileSync.mockImplementation((path) => {
        if (String(path).includes('cpu.max')) return '400000 100000'; // 4 CPU
        throw new Error('ENOENT');
      });
      expect(service.detectCpuLimit()).toBe(4);
    });

    it('retombe sur cgroup v1 si cpu.max est absent ou vaut "max"', () => {
      mockedReadFileSync.mockImplementation((path) => {
        const p = String(path);
        if (p.includes('cpu.max')) throw new Error('ENOENT');
        if (p.includes('cfs_quota_us')) return '200000';
        if (p.includes('cfs_period_us')) return '100000';
        throw new Error('ENOENT');
      });
      expect(service.detectCpuLimit()).toBe(2);
    });

    it("retombe sur les CPU logiques de l'hôte si aucun cgroup n'est lisible (dev local)", () => {
      mockNoCgroup(6);
      expect(service.detectCpuLimit()).toBe(6);
    });

    it('traite cpu.max = "max" (pas de limite posée) comme absent, pas comme une valeur', () => {
      mockedReadFileSync.mockImplementation((path) => {
        if (String(path).includes('cpu.max')) return 'max 100000';
        throw new Error('ENOENT');
      });
      mockedCpus.mockReturnValue(new Array(8).fill({}) as os.CpuInfo[]);
      expect(service.detectCpuLimit()).toBe(8);
    });

    it('met le résultat en cache — un seul accès disque par instance', () => {
      mockedReadFileSync.mockImplementation(() => '400000 100000');
      service.detectCpuLimit();
      service.detectCpuLimit();
      expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEffectiveSettings — recommandation par défaut (sans ligne en base)', () => {
    beforeEach(() => {
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(null);
    });

    it('≤5 CPU détectés → concurrency=1, threads=CPU (le ladder single-pass extrait déjà le parallélisme)', async () => {
      mockNoCgroup(4);
      const settings = await service.getEffectiveSettings();
      expect(settings.recommendedConcurrency).toBe(1);
      expect(settings.recommendedThreads).toBe(4);
      expect(settings.workerConcurrencyIsOverride).toBe(false);
    });

    it('>5 CPU détectés → concurrency=2, threads=CPU/2', async () => {
      mockNoCgroup(8);
      const settings = await service.getEffectiveSettings();
      expect(settings.recommendedConcurrency).toBe(2);
      expect(settings.recommendedThreads).toBe(4);
    });

    it(
      'régression 2026-07-03 : concurrency × threads ne doit jamais dépasser le CPU détecté ' +
        '(sur-souscription — cause du ralentissement diffus trouvé sur le serveur de prod)',
      async () => {
        for (const cpu of [1, 2, 3, 4, 5, 6, 8, 12, 16]) {
          mockNoCgroup(cpu);
          prisma.videoPipelineSettings.findUnique.mockResolvedValue(null);
          const fresh = new VideoPipelineSettingsService(prisma);
          const settings = await fresh.getEffectiveSettings();
          expect(settings.recommendedConcurrency * settings.recommendedThreads).toBeLessThanOrEqual(
            cpu,
          );
        }
      },
    );

    it('valeur par défaut : plafond 1080p, pas de surcharge par plan', async () => {
      mockNoCgroup(4);
      const settings = await service.getEffectiveSettings();
      expect(settings.maxQualityCode).toBe('1080p');
      expect(settings.maxQualityCodeByPlan).toBeNull();
    });
  });

  describe('getEffectiveSettings — avec une ligne en base', () => {
    it('préfère lastDetectedCpuLimit (rapporté par le worker) à une détection locale', async () => {
      // Le conteneur API (qui exécute ce test) "détecterait" 2 CPU localement,
      // mais le worker a rapporté 4 — c'est cette valeur qui doit faire foi
      // (bug trouvé le 2026-07-03 : l'admin affichait la limite du conteneur
      // API, pas celle du worker qui encode réellement).
      mockNoCgroup(2);
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(baseRow({ lastDetectedCpuLimit: 4 }));

      const settings = await service.getEffectiveSettings();
      expect(settings.detectedCpuLimit).toBe(4);
    });

    it('une surcharge admin (workerConcurrencyOverride) prend le pas sur la recommandation', async () => {
      mockNoCgroup(4);
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(
        baseRow({ workerConcurrencyOverride: 3, lastDetectedCpuLimit: 4, updatedBy: 'admin-user-id' }),
      );

      const settings = await service.getEffectiveSettings();
      expect(settings.workerConcurrency).toBe(3);
      expect(settings.workerConcurrencyIsOverride).toBe(true);
    });

    it(
      'correctif 2026-07-03 : ffmpegThreads est toujours recalculé depuis la concurrency ' +
        'effective (même surchargée) — plus aucun réglage indépendant possible, la ' +
        'sur-souscription est éliminée par construction plutôt que détectée a posteriori',
      async () => {
        mockNoCgroup(4);
        prisma.videoPipelineSettings.findUnique.mockResolvedValue(
          baseRow({ workerConcurrencyOverride: 3, lastDetectedCpuLimit: 4 }),
        );

        const settings = await service.getEffectiveSettings();
        expect(settings.workerConcurrency).toBe(3);
        expect(settings.ffmpegThreads).toBe(Math.floor(4 / 3));
        expect(settings.workerConcurrency * settings.ffmpegThreads).toBeLessThanOrEqual(4);
      },
    );

    it('EffectivePipelineSettings ne contient plus de champ ffmpegThreadsIsOverride (retiré le 2026-07-03)', async () => {
      mockNoCgroup(4);
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(baseRow());
      const settings = await service.getEffectiveSettings();
      expect(settings).not.toHaveProperty('ffmpegThreadsIsOverride');
    });
  });

  describe('resolveMaxQualityHeightForAsset', () => {
    beforeEach(() => {
      mockNoCgroup(4);
    });

    it('sans surcharge par plan, renvoie la hauteur du plafond global', async () => {
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(baseRow({ maxQualityCode: '1080p' }));

      const height = await service.resolveMaxQualityHeightForAsset('asset-1');
      expect(height).toBe(1080);
      // Pas de lookup DB inutile si aucune surcharge par plan n'est configurée
      expect(prisma.videoAsset.findUnique).not.toHaveBeenCalled();
    });

    it('un plan avec surcharge (ex: PREMIUM → 2160p) remplace le plafond global', async () => {
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(
        baseRow({ maxQualityCode: '1080p', maxQualityCodeByPlan: { PREMIUM: '2160p' } }),
      );
      prisma.videoAsset.findUnique.mockResolvedValue({
        content: { creator: { userId: 'creator-1' } },
      });
      prisma.userSubscription.findFirst.mockResolvedValue({ plan: { code: 'PREMIUM' } });

      const height = await service.resolveMaxQualityHeightForAsset('asset-1');
      expect(height).toBe(2160);
    });

    it('un créateur dont le plan actif ne correspond à aucune surcharge garde le plafond global', async () => {
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(
        baseRow({ maxQualityCode: '1080p', maxQualityCodeByPlan: { PREMIUM: '2160p' } }),
      );
      prisma.videoAsset.findUnique.mockResolvedValue({
        content: { creator: { userId: 'creator-1' } },
      });
      prisma.userSubscription.findFirst.mockResolvedValue({ plan: { code: 'FREE' } });

      const height = await service.resolveMaxQualityHeightForAsset('asset-1');
      expect(height).toBe(1080);
    });

    it('aucun abonnement actif → garde le plafond global sans planter', async () => {
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(
        baseRow({ maxQualityCode: '720p', maxQualityCodeByPlan: { PREMIUM: '2160p' } }),
      );
      prisma.videoAsset.findUnique.mockResolvedValue({
        content: { creator: { userId: 'creator-1' } },
      });
      prisma.userSubscription.findFirst.mockResolvedValue(null);

      const height = await service.resolveMaxQualityHeightForAsset('asset-1');
      expect(height).toBe(720);
    });
  });

  describe('qualityCodeToHeight', () => {
    it.each([
      ['240p', 240],
      ['1080p', 1080],
      ['2160p', 2160],
    ])('%s → %dpx', (code, expected) => {
      expect(service.qualityCodeToHeight(code)).toBe(expected);
    });

    it('code inconnu retombe sur le plus haut profil (jamais un plafond silencieusement trop bas)', () => {
      expect(service.qualityCodeToHeight('9999p-invalide')).toBe(2160);
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      mockNoCgroup(4);
      prisma.videoPipelineSettings.upsert.mockResolvedValue(undefined);
      prisma.videoPipelineSettings.findUnique.mockResolvedValue(
        baseRow({ maxQualityCode: '720p', workerConcurrencyOverride: 2, updatedBy: 'admin-1' }),
      );
    });

    it('upsert avec updatedBy et les champs fournis', async () => {
      await service.updateSettings({ maxQualityCode: '720p', workerConcurrencyOverride: 2 }, 'admin-1');
      expect(prisma.videoPipelineSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'default' },
          update: expect.objectContaining({
            maxQualityCode: '720p',
            workerConcurrencyOverride: 2,
            updatedBy: 'admin-1',
          }),
        }),
      );
    });

    it('renvoie les settings effectifs après mise à jour', async () => {
      const result = await service.updateSettings({ maxQualityCode: '720p' }, 'admin-1');
      expect(result.maxQualityCode).toBe('720p');
      expect(result.updatedBy).toBe('admin-1');
    });
  });
});
