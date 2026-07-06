import {
  resolveProfilesForSource,
  resolveCpuParallelism,
  resolveWorkerConcurrency,
  resolveFFmpegThreads,
  setEffectiveFFmpegThreads,
  RENDITION_PROFILES,
} from './video-pipeline.constants';

describe('resolveProfilesForSource', () => {
  afterEach(() => {
    delete process.env.VIDEO_DEV_PROFILES;
    delete process.env.VIDEO_FAST_MODE;
  });

  it("n'inclut jamais une résolution supérieure à la source (pas d'upscale)", () => {
    const names = resolveProfilesForSource(720).map((p) => p.name);
    expect(names).toEqual(['240p', '360p', '480p', '720p']);
  });

  it('applique la tolérance de 5% pour une source légèrement sous un palier', () => {
    // 710px doit quand même inclure 720p (710 * 1.05 = 745.5 >= 720)
    const names = resolveProfilesForSource(710).map((p) => p.name);
    expect(names).toContain('720p');
  });

  it('sans plafond (maxAllowedHeight omis), une source 4K produit les 7 paliers', () => {
    const names = resolveProfilesForSource(2160).map((p) => p.name);
    expect(names).toEqual(['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p']);
  });

  it(
    'régression 2026-07-03 : avec un plafond admin (maxAllowedHeight), une source 4K ' +
      "s'arrête au plafond — c'est exactement le calcul que doit refléter le statut affiché " +
      '(voir videos.service.ts resolveUploadStatus) pour ne jamais diverger du worker',
    () => {
      const names = resolveProfilesForSource(2160, 1080).map((p) => p.name);
      expect(names).toEqual(['240p', '360p', '480p', '720p', '1080p']);
      expect(names).not.toContain('1440p');
      expect(names).not.toContain('2160p');
    },
  );

  it('le plafond ne fait jamais upscaler au-delà de la source même si le plafond est plus haut', () => {
    // Plafond 2160p mais source seulement 480p → toujours borné par la source
    const names = resolveProfilesForSource(480, 2160).map((p) => p.name);
    expect(names).toEqual(['240p', '360p', '480p']);
  });

  it('retombe sur le plus petit profil si le plafond est plus bas que tous les paliers', () => {
    const names = resolveProfilesForSource(2160, 100).map((p) => p.name);
    expect(names).toEqual(['240p']);
  });

  it('VIDEO_DEV_PROFILES restreint la ladder à la liste donnée', () => {
    process.env.VIDEO_DEV_PROFILES = '480p,720p';
    const names = resolveProfilesForSource(2160).map((p) => p.name);
    expect(names).toEqual(['480p', '720p']);
  });

  it('ne renvoie jamais une liste vide', () => {
    for (const h of [1, 100, 240, 4320]) {
      expect(resolveProfilesForSource(h).length).toBeGreaterThan(0);
    }
  });
});

describe('resolveCpuParallelism', () => {
  afterEach(() => {
    delete process.env.VIDEO_CPU_PARALLEL;
  });

  it('défaut à 2 si non configuré', () => {
    delete process.env.VIDEO_CPU_PARALLEL;
    expect(resolveCpuParallelism('production')).toBe(2);
  });

  it('plafonne à 8 même si VIDEO_CPU_PARALLEL est plus haut', () => {
    process.env.VIDEO_CPU_PARALLEL = '99';
    expect(resolveCpuParallelism('production')).toBe(8);
  });
});

describe('resolveWorkerConcurrency', () => {
  afterEach(() => {
    delete process.env.VIDEO_WORKER_CONCURRENCY;
  });

  it('défaut à 1 si non configuré', () => {
    delete process.env.VIDEO_WORKER_CONCURRENCY;
    expect(resolveWorkerConcurrency()).toBe(1);
  });

  it('plafonne à 4', () => {
    process.env.VIDEO_WORKER_CONCURRENCY = '50';
    expect(resolveWorkerConcurrency()).toBe(4);
  });
});

describe('resolveFFmpegThreads / setEffectiveFFmpegThreads', () => {
  afterEach(() => {
    delete process.env.VIDEO_FFMPEG_THREADS;
    setEffectiveFFmpegThreads(null);
  });

  it('défaut à 4 si non configuré', () => {
    delete process.env.VIDEO_FFMPEG_THREADS;
    setEffectiveFFmpegThreads(null);
    expect(resolveFFmpegThreads()).toBe(4);
  });

  it(
    'setEffectiveFFmpegThreads (VideoPipelineSettingsService) prend le pas sur la variable ' +
      "d'environnement — c'est le mécanisme qui permet à l'admin de changer la valeur sans redéploiement",
    () => {
      process.env.VIDEO_FFMPEG_THREADS = '4';
      setEffectiveFFmpegThreads(2);
      expect(resolveFFmpegThreads()).toBe(2);
    },
  );

  it('setEffectiveFFmpegThreads(null) restaure le comportement basé sur les variables d’environnement', () => {
    process.env.VIDEO_FFMPEG_THREADS = '6';
    setEffectiveFFmpegThreads(3);
    expect(resolveFFmpegThreads()).toBe(3);
    setEffectiveFFmpegThreads(null);
    expect(resolveFFmpegThreads()).toBe(6);
  });
});

describe('RENDITION_PROFILES', () => {
  it('est trié par hauteur croissante (les fonctions de coupure en dépendent)', () => {
    const heights = RENDITION_PROFILES.map((p) => p.height);
    const sorted = [...heights].sort((a, b) => a - b);
    expect(heights).toEqual(sorted);
  });

  it('chaque profil a des valeurs strictement positives', () => {
    for (const p of RENDITION_PROFILES) {
      expect(p.height).toBeGreaterThan(0);
      expect(p.videoBitrate).toBeGreaterThan(0);
      expect(p.audioBitrate).toBeGreaterThan(0);
      expect(p.crf).toBeGreaterThanOrEqual(0);
    }
  });
});
