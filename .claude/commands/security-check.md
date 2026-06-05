# Checklist sécurité iVOD

Lance une vérification des points de sécurité critiques identifiés sur ce projet.

## 🔴 PRIORITÉ 1 — Streaming HLS (dette critique)

**Fichier** : `apps/api/src/modules/videos/videos.service.ts`
**Problème** : Le playback token HLS est signé avec le même `JWT_SECRET` que les access tokens,
sans vérification du claim `purpose`, ni contrôle d'entitlement par contenu.
Un access token normal est accepté comme playback token.

**Vérifier** :
```bash
grep -n "signPlaybackToken\|verifyPlaybackToken\|purpose.*playback\|playback.*purpose" \
  apps/api/src/modules/videos/videos.service.ts
```

**Statut attendu** : Le token doit contenir `purpose: 'playback'` ET `contentId/episodeId`,
signé avec `PLAYBACK_JWT_SECRET` séparé, et `verifyPlaybackToken` doit vérifier ces deux claims.

---

## 🔴 PRIORITÉ 2 — Guards globaux API

**Fichier** : `apps/api/src/app.module.ts`
**Problème** : Pas de `APP_GUARD` global → un endpoint sensible ajouté sans `@UseGuards` est ouvert.

**Vérifier** :
```bash
grep -n "APP_GUARD\|APP_INTERCEPTOR" apps/api/src/app.module.ts
```

**Statut attendu** : Voir `{ provide: APP_GUARD, useClass: JwtAuthGuard }` dans `providers`.

---

## 🔴 PRIORITÉ 3 — Simulation Paystack en production

**Fichier** : `apps/api/src/modules/payments/providers/paystack.provider.ts`
**Problème** : Sans `PAYSTACK_SECRET_KEY`, le provider simule un paiement PENDING.

**Vérifier** :
```bash
grep -n "simulation\|TEST_MODE\|secret.*undefined\|mode.*test" \
  apps/api/src/modules/payments/providers/paystack.provider.ts
```

---

## 🟡 PRIORITÉ 4 — Cookie web non-HttpOnly

**Fichier** : `apps/web/lib/auth/session.ts`
**Problème** : `document.cookie` → lisible par JS (XSS). Le commentaire dit "évite XSS" — c'est faux.

**Vérifier** :
```bash
grep -n "document.cookie\|HttpOnly\|httpOnly" apps/web/lib/auth/session.ts
```

---

## 🟡 PRIORITÉ 5 — Signature JWT optionnelle dans proxy.ts

**Fichier** : `apps/web/proxy.ts`
**Problème** : `JWT_VERIFY_SECRET` optionnel → rôles UI forgeables si non défini.

**Vérifier** :
```bash
grep -n "JWT_VERIFY_SECRET\|verify\|decode" apps/web/proxy.ts
```

---

## 🟡 PRIORITÉ 6 — Validation env au démarrage API

**Fichier** : `apps/api/src/app.module.ts` (ConfigModule)
**Problème** : Pas de validation de schéma → démarrage silencieux avec `JWT_SECRET=change-me`.

**Vérifier** :
```bash
grep -n "validationSchema\|Joi\|zod" apps/api/src/app.module.ts
```

---

## 🟡 PRIORITÉ 7 — Redis KEYS bloquant en production

**Fichier** : `apps/api/src/common/services/redis.service.ts`
**Problème** : `KEYS` bloque Redis sous charge.

**Vérifier** :
```bash
grep -n "\.keys\|KEYS" apps/api/src/common/services/redis.service.ts
```
**Attendu** : `SCAN` à la place de `KEYS`.

---

## 🟠 PRIORITÉ 8 — Guard de navigation mobile

**Fichier** : `apps/mobile/app/_layout.tsx`
**Problème** : Pas de redirection centralisée non-authentifié → login.

**Vérifier** :
```bash
grep -n "isAuthenticated\|Redirect\|redirect" apps/mobile/app/_layout.tsx
```

---

## Commande de scan rapide

```bash
echo "=== Playback token ==="
grep -n "signPlaybackToken\|verifyPlaybackToken" apps/api/src/modules/videos/videos.service.ts | head -5

echo "=== APP_GUARD ==="
grep -n "APP_GUARD" apps/api/src/app.module.ts

echo "=== Cookie web ==="
grep -n "document.cookie" apps/web/lib/auth/session.ts

echo "=== JWT_VERIFY_SECRET ==="
grep -n "JWT_VERIFY_SECRET" apps/web/proxy.ts

echo "=== Redis KEYS ==="
grep -rn "\.keys\b" apps/api/src/common/services/redis.service.ts
```
