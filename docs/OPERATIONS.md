# iVOD — Notes opérationnelles (post-déploiement)

Remplace l'ancien fichier `pass-to-prod` (notes en vrac à la racine, sans
extension). Son contenu a été trié :
- Ce qui décrivait la **mise en route serveur** (certbot, `.env`, premier
  démarrage) est maintenant entièrement automatisé — voir `docs/DEPLOY.md`
  et `scripts/bootstrap-server.sh`/`remote-bootstrap.sh`.
- Ce qui décrivait les **secrets/CI GitHub** est dans `docs/CI-CD.md`.
- Ce qui reste — vraies tâches encore ouvertes ou notes de fonctionnement —
  est regroupé ici, par app (API, Web, Mobile), avec l'état vérifié à
  aujourd'hui plutôt que recopié tel quel.

---

## 1. API — Monitoring d'erreurs (Sentry)

Optionnel, mais recommandé avant d'ouvrir à de vrais utilisateurs.

1. [sentry.io](https://sentry.io) → nouveau projet → plateforme **Node.js**
2. Copier le DSN dans `apps/api/.env` (`SENTRY_DSN=...`, déjà présent en
   commentaire dans `.env.production`)
3. `SENTRY_RELEASE` (optionnel) : utile pour corréler les erreurs à un
   déploiement précis — pourrait être automatisé plus tard dans `deploy.sh`
   (`SENTRY_RELEASE=$(git rev-parse --short HEAD)`), pas fait aujourd'hui.

Sans DSN configuré, l'API démarre normalement — Sentry ne s'initialise que
si la variable est définie (`@sentry/nestjs`, voir `src/instrument.ts`).

## 2. API — Monitoring infra (Uptime Kuma + Grafana)

`make monitoring-up` démarre Uptime Kuma + Loki + Grafana (voir
`apps/monitoring/docker-compose.monitoring.yml`). Ports liés à `127.0.0.1`
uniquement sur le VPS — accès via tunnel SSH (voir `docs/DEPLOY.md`).

Une fois lancé, à faire manuellement dans l'UI Uptime Kuma (`:3002`) :
- Monitor HTTP sur `https://ivod-preprod-srv01.xselcloud.com/api/v1/health`
- Monitor HTTP sur `https://ivod-preprod-srv01.xselcloud.com/`
- Monitor TCP sur le port Postgres interne (via `docker exec`, pas exposé publiquement)
- Notifications (email/Slack/Discord) sur alerte — à configurer selon vos préférences

`GRAFANA_PASSWORD` est déjà généré dans `apps/api/.env.production` — rien à
faire de plus que le déploiement initial pour ce point.

## 3. API — Bascule vers stockage S3 externe (Wasabi) — scalabilité

Le choix actuel est **MinIO self-hosted** (`make prod-build`) — simple à
démarrer, mais le VPS devient le SPOF du stockage vidéo (voir limite HA dans
`docs/DEPLOY.md` § 0). Wasabi (ou tout S3 compatible) découple le stockage du
serveur applicatif : à envisager quand le volume vidéo grossit.

Le code NestJS ne change pas — seules les variables d'environnement
changent (`MinioService`, `apps/api/src/common/services/minio.service.ts`,
gère déjà les deux modes : `MINIO_REGION` explicite et
`MINIO_SKIP_BUCKET_INIT=true` pour éviter l'appel `getBucketRegion`
incompatible avec un endpoint S3 externe).

**3 étapes pour activer Wasabi :**
1. Créer les buckets `ivod-videos-prod` et `ivod-assets-prod` dans la
   console Wasabi (région `eu-west-1`)
2. Remplir `apps/api/.env` avec les valeurs Wasabi commentées dans
   `.env.example` (section "Mode production Wasabi")
3. Démarrer avec `make prod-s3-build` (utilise
   `apps/api/docker-compose.s3-external.yml` en plus, désactive MinIO)

**CDN Cloudflare devant Wasabi** (recommandé avec ce mode, pour le
streaming HLS) : CNAME `cdn.ivod.africa` → `s3.eu-west-1.wasabisys.com`,
puis `VIDEO_CDN_BASE_URL=https://cdn.ivod.africa` dans `apps/api/.env`.
Règle de cache Cloudflare : `*.ts` = cache long, `*.m3u8` = cache court (2s,
car la playlist HLS change à chaque nouveau segment généré).

⚠️ Ce point Cloudflare suppose que `ivod.africa` est configuré — voir § 5,
actuellement **pas le cas**.

## 4. Web — rien en attente

Aucune tâche opérationnelle propre au web au-delà de ce qui est déjà dans
`docs/DEPLOY.md`/`docs/CI-CD.md`.

## 5. Mobile — ⚠️ 2 blocages avant une vraie sortie store

Vérifié en préparant ce document (pas supposé) :

```
curl https://ivod.africa       → 000 (aucune réponse, DNS ne résout pas)
curl https://api.ivod.africa   → 000 (idem)
```

**Corrigé** (Option A appliquée) : `apps/mobile/eas.json` (profils `preview` et
`production`) pointe désormais vers `https://ivod-preprod-srv01.xselcloud.com`
— le serveur réellement en ligne aujourd'hui — au lieu de `ivod.africa`/
`api.ivod.africa/cdn.ivod.africa` qui ne résolvaient pas du tout. **⚠️ Il
faudra un nouveau build** (pas un simple OTA — `EXPO_PUBLIC_API_URL` et
`EXPO_PUBLIC_WEB_URL` sont bakées au build, comme les `NEXT_PUBLIC_*` du web)
le jour où `ivod.africa` sera prêt et qu'on voudra basculer dessus.

**Bug corrigé au passage, plus grave** : `EXPO_PUBLIC_WEB_URL` n'était défini
dans AUCUN profil `eas.json` — `core/config/payment.ts` (callback Paystack)
retombait silencieusement sur `http://localhost:3001` **même en build de
production**, ce qui aurait rendu tout paiement Mobile Money inutilisable sur
un vrai téléphone. Ajouté dans les 3 profils. Un second endroit avait aussi
`https://ivod.africa` en dur : `core/entities/watch.entity.ts`
(`buildResumeWebLink`, les liens de partage "reprendre la lecture") — lit
maintenant `EXPO_PUBLIC_WEB_URL` comme le reste.

Au passage, `EXPO_PUBLIC_MEDIA_URL` (présent dans `eas.json`/`.env.example`
mais jamais lu par aucun code — `src/utils/assets.ts` passe par le proxy API
comme le web) a été retiré : configuration morte qui pointait elle aussi vers
`cdn.ivod.africa`.

**Second blocage, indépendant** — `apps/mobile/eas.json`, section `submit`,
a encore des identifiants placeholder :
```json
"ascAppId": "XXXXXXXXXX",
"appleTeamId": "XXXXXXXXXX",
"serviceAccountKeyPath": "./google-service-account.json"
```
`eas build` (juste compiler) fonctionne sans ces valeurs. `eas submit`
(pousser vers App Store/Play Store) échouera tant qu'elles ne sont pas
remplies avec vos vrais identifiants développeur Apple/Google — voir
`docs/CI-CD.md` § 5, déjà noté comme volontairement non automatisé.
