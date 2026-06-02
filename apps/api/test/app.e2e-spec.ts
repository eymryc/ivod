import request from 'supertest';

const BASE = `${process.env.TEST_API_URL ?? 'http://localhost:3002'}/api/v1`;

// Tokens partagés pour tous les tests
let adminToken = '';
let viewerToken = '';
let refreshToken = '';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const loginAs = async (email: string, password: string) => {
  await delay(500);
  const res = await request(BASE).post('/auth/login').send({ email, password });
  if (res.status === 429) {
    await delay(3000);
    const retry = await request(BASE).post('/auth/login').send({ email, password });
    return retry;
  }
  return res;
};

// ─── Auth globale (une seule fois) ──────────────────────────────────────────
beforeAll(async () => {
  const adminRes = await loginAs('admin@ivod.africa', 'Password123!');
  if (adminRes.status === 200) {
    adminToken = adminRes.body.data?.accessToken ?? '';
    refreshToken = adminRes.body.data?.refreshToken ?? '';
  }

  const viewerRes = await loginAs('josephyobouet68@gmail.com', 'Password123!');
  if (viewerRes.status === 200) {
    viewerToken = viewerRes.body.data?.accessToken ?? '';
  }
}, 15000);

afterAll(async () => {
  const pid = require('fs').readFileSync('/tmp/ivod-test-api.pid', 'utf8').trim();
  // Ne pas tuer l'API — elle peut être réutilisée
});

// ─── 1. Santé ────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('retourne 200 avec status ok', async () => {
    const res = await request(BASE).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

// ─── 2. Auth ─────────────────────────────────────────────────────────────────
describe('Auth', () => {
  it('login admin retourne accessToken + refreshToken', () => {
    expect(adminToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  it('retourne 401 sur mauvais identifiants (email inexistant)', async () => {
    await delay(1200);
    const res = await request(BASE).post('/auth/login').send({ email: 'nobody@ivod.africa', password: 'WrongPass!' });
    // 401 attendu, 429 acceptable si throttled
    expect([401, 429]).toContain(res.status);
    if (res.status === 401) {
      expect(res.body.error?.code).toBe('AUTH_002');
    }
  });

  it('POST /auth/refresh retourne un nouveau accessToken', async () => {
    if (!refreshToken) return;
    const res = await request(BASE).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    // Mettre à jour le token
    adminToken = res.body.data.accessToken;
  });

  it('POST /auth/refresh rejette un token invalide', async () => {
    const res = await request(BASE).post('/auth/refresh').send({ refreshToken: 'invalid.bad.token' });
    expect(res.status).toBe(401);
  });

  it('route protégée sans token retourne 401', async () => {
    const res = await request(BASE).get('/profiles');
    expect(res.status).toBe(401);
  });
});

// ─── 3. Référentiels ─────────────────────────────────────────────────────────
describe('GET /references', () => {
  it('retourne tous les référentiels seeded', async () => {
    const res = await request(BASE).get('/references');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('genres');
    expect(d).toHaveProperty('userPlans');
    expect(d).toHaveProperty('contentTypes');
    expect(d).toHaveProperty('paymentProviders');
    expect(d.userPlans.length).toBeGreaterThanOrEqual(3);
    expect(d.genres.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── 4. Genres ───────────────────────────────────────────────────────────────
describe('GET /genres', () => {
  it('retourne les genres avec code + slug', async () => {
    const res = await request(BASE).get('/genres');
    expect(res.status).toBe(200);
    const genres = res.body.data;
    expect(Array.isArray(genres)).toBe(true);
    expect(genres.length).toBeGreaterThan(0);
    const action = genres.find((g: any) => g.code === 'ACTION');
    expect(action).toBeDefined();
    expect(action.slug).toBe('action');
  });

  it('GET /genres/:slug retourne le genre', async () => {
    const res = await request(BASE).get('/genres/drame');
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('DRAME');
  });

  it('GET /genres/:slug/contents retourne des contenus (vide sur BDD vierge)', async () => {
    const res = await request(BASE).get('/genres/action/contents');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
  });
});

// ─── 5. Abonnements ───────────────────────────────────────────────────────────
describe('Subscriptions', () => {
  it('GET /subscriptions/plans retourne les plans', async () => {
    const res = await request(BASE).get('/subscriptions/plans').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const plans = res.body.data;
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.some((p: any) => p.code === 'FREE')).toBe(true);
    expect(plans.some((p: any) => p.code === 'PREMIUM')).toBe(true);
  });

  it('GET /subscriptions/me retourne le statut abonnement', async () => {
    const res = await request(BASE).get('/subscriptions/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hasActiveSubscription');
  });
});

// ─── 6. Profils ──────────────────────────────────────────────────────────────
describe('Profiles', () => {
  let profileId = '';

  it('GET /profiles retourne les profils du viewer', async () => {
    const res = await request(BASE).get('/profiles').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    const profiles = res.body.data;
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);
    const def = profiles.find((p: any) => p.isDefault);
    expect(def).toBeDefined();
    profileId = def?.id ?? profiles[0]?.id;
  });

  it('POST /profiles crée un nouveau profil', async () => {
    const res = await request(BASE).post('/profiles').set('Authorization', `Bearer ${viewerToken}`).send({ name: 'Profil Test E2E', isKids: false });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Profil Test E2E');
    // Nettoyer
    if (res.body.data?.id) {
      await request(BASE).delete(`/profiles/${res.body.data.id}`).set('Authorization', `Bearer ${viewerToken}`);
    }
  });
});

// ─── 7. Contenus ─────────────────────────────────────────────────────────────
describe('Contents', () => {
  it('GET /contents retourne 200 sans auth', async () => {
    const res = await request(BASE).get('/contents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('GET /contents/:id retourne 404 sur ID inexistant', async () => {
    const res = await request(BASE).get('/contents/cm_inexistant');
    expect(res.status).toBe(404);
  });

  it('POST /contents sans token retourne 401', async () => {
    const res = await request(BASE).post('/contents').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ─── 8. Search ────────────────────────────────────────────────────────────────
describe('Search', () => {
  it('GET /search?q=action retourne une structure correcte', async () => {
    const res = await request(BASE).get('/search?q=action');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('query');
  });

  it('GET /search/autocomplete?q=act retourne des suggestions', async () => {
    const res = await request(BASE).get('/search/autocomplete?q=act');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('suggestions');
    expect(Array.isArray(res.body.data.suggestions)).toBe(true);
  });

  it('GET /search/trending retourne les tendances', async () => {
    const res = await request(BASE).get('/search/trending');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('trendingContents');
    expect(res.body.data).toHaveProperty('trendingSearches');
  });
});

// ─── 9. Watch sessions ────────────────────────────────────────────────────────
describe('Watch Sessions', () => {
  it('POST /watch-sessions sans token retourne 401', async () => {
    const res = await request(BASE).post('/watch-sessions').send({ contentId: 'fake' });
    expect(res.status).toBe(401);
  });

  it('GET /watch-sessions/active retourne les sessions actives', async () => {
    const res = await request(BASE).get('/watch-sessions/active').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('sessions');
    expect(res.body.data).toHaveProperty('count');
  });
});

// ─── 10. Devices ─────────────────────────────────────────────────────────────
describe('Devices', () => {
  it('GET /devices retourne les appareils enregistrés', async () => {
    const res = await request(BASE).get('/devices').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /devices enregistre un appareil', async () => {
    const res = await request(BASE).post('/devices').set('Authorization', `Bearer ${viewerToken}`).send({
      deviceType: 'WEB', deviceName: 'Chrome E2E', os: 'macOS', fingerprint: `e2e-test-${Date.now()}`,
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.data.deviceType).toBe('WEB');
  });
});

// ─── 11. Recommendations ─────────────────────────────────────────────────────
describe('Recommendations', () => {
  it('GET /recommendations retourne la structure attendue', async () => {
    const res = await request(BASE).get('/recommendations').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
  });
});

// ─── 12. Revenue ─────────────────────────────────────────────────────────────
describe('Revenue', () => {
  it('GET /revenue/rules retourne les règles de partage', async () => {
    const res = await request(BASE).get('/revenue/rules').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const rules = res.body.data;
    expect(Array.isArray(rules)).toBe(true);
    const defaultRule = rules.find((r: any) => r.code === 'PLATFORM_DEFAULT');
    expect(defaultRule).toBeDefined();
    expect(defaultRule.creatorSharePct).toBe(70);
    expect(defaultRule.platformSharePct).toBe(30);
  });

  it('GET /revenue/statements retourne les statements', async () => {
    const res = await request(BASE).get('/revenue/statements').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
  });
});

// ─── 13. Downloads ───────────────────────────────────────────────────────────
describe('Downloads', () => {
  it('GET /downloads retourne la liste (vide sur BDD vierge)', async () => {
    const res = await request(BASE).get('/downloads').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── 14. Banners ─────────────────────────────────────────────────────────────
describe('Banners', () => {
  it('GET /banners retourne les bannières actives (public)', async () => {
    const res = await request(BASE).get('/banners');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── 15. People ──────────────────────────────────────────────────────────────
describe('People', () => {
  it('GET /people retourne la liste des personnes', async () => {
    const res = await request(BASE).get('/people');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
  });
});
