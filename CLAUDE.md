# iVOD — Guide de développement pour Claude

Plateforme VOD africaine (Afrique francophone, paiements XOF/FCFA).
Monorepo Turborepo : **API NestJS** + **Web Next.js** + **Mobile Expo**.

---

## Architecture globale

```
IVOD/
├── apps/
│   ├── api/          # NestJS 10 + Prisma 5 + BullMQ + MinIO (Docker)
│   ├── web/          # Next.js 16 + React 19 + Tailwind CSS v4 (local port 3001)
│   └── mobile/       # Expo SDK 52 + React Native (simulateur / device)
├── turbo.json        # Pipeline Turborepo
└── package.json      # pnpm workspaces
```

### Ports en développement
| Service | Port | Accès |
|---|---|---|
| API NestJS | 3000 | http://localhost:3000/api/v1 |
| Swagger | 3000 | http://localhost:3000/api/v1/docs |
| Web Next.js | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | psql postgresql://ivod:password@localhost:5432/ivod |
| Redis | 6379 | redis://localhost:6379 |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Adminer (DB UI) | 8080 | http://localhost:8080 |

---

## Démarrer l'environnement

```bash
# Tout l'environnement Docker (API + worker + PostgreSQL + Redis + MinIO + Adminer)
docker compose -f apps/api/docker-compose.dev.yml up -d

# Web Next.js (séparé, hot-reload local)
cd apps/web && pnpm dev           # port 3001

# Mobile Expo
cd apps/mobile && npx expo start  # QR code ou simulateur

# Voir les logs API
docker logs -f ivod-api-dev

# Redémarrer l'API (après modif TypeScript)
docker restart ivod-api-dev
```

---

## Commandes utiles Docker (API dockerisée)

```bash
# Exécuter une commande dans le container API
docker exec ivod-api-dev <commande>

# Générer le client Prisma (après modif schema.prisma)
docker exec ivod-api-dev npx prisma generate

# Appliquer une migration SQL manuellement
psql postgresql://ivod:password@localhost:5432/ivod -f migration.sql

# Seeds
docker exec ivod-api-dev npx ts-node prisma/seed.ts

# Voir tous les containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## Conventions partagées entre les 3 apps

### Réponse API
Toutes les réponses API suivent ce format :
```json
{ "success": true, "data": { ... }, "meta": { "total": 100, "page": 1 } }
```
Géré par `TransformInterceptor` côté API.

### Codes d'erreur
Format `MODULE_NNN` :
- `AUTH_001` → email requis
- `BANNER_001` → bannière introuvable
- `CONTENT_001` → contenu introuvable

### Monnaie
Toujours en XOF (FCFA), entiers uniquement. `formatXOF(n)` → "15 000 FCFA".

### Assets MinIO
```
ivod-assets/  → images, posters, thumbnails, bannières, avatars, sous-titres
ivod-videos/  → vidéos HLS, segments, manifestes
```
URL publique : `${MINIO_PUBLIC_ENDPOINT}:${MINIO_PORT}/<bucket>/<objectKey>`

### Plans abonnement
| Code | Label | Prix | Écrans | Qualité |
|---|---|---|---|---|
| FREE | Gratuit | 0 XOF | 1 | SD + pub |
| BASIC | Basic | ~500-1000 XOF/mois | 2 | HD |
| PREMIUM | Premium | ~1500-2000 XOF/mois | 4 | FHD, exclusifs |

---

## Règles de développement globales

1. **Ne jamais modifier** `apps/api/prisma/schema.prisma` sans prévoir une migration SQL dans `prisma/migrations/`.
2. **Toujours régénérer** le client Prisma après toute modif de schema : `docker exec ivod-api-dev npx prisma generate`.
3. **L'API est dockerisée** — `npx prisma migrate dev` en local ne fonctionne pas. Créer le SQL manuellement et appliquer via `psql`.
4. **Les tokens JWT** sont stockés en mémoire (web) ou via `SecureStore` (mobile). Ne jamais utiliser `localStorage` directement pour les tokens.
5. **Pas de `any` TypeScript** sauf dans les composants admin/form en attente de types générés.
6. Langue du code : **français** pour les commentaires et messages utilisateur, **anglais** pour les identifiants et variables.

---

## Variables d'environnement critiques (apps/api/.env)

```env
DATABASE_URL=postgresql://ivod:password@localhost:5432/ivod
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
CORS_ORIGIN=http://localhost:3001
PAYSTACK_SECRET_KEY=...
SMTP_HOST=...
```

---

## Stack technique par app

| | API | Web | Mobile |
|---|---|---|---|
| Framework | NestJS 10 | Next.js 16 (App Router) | Expo SDK 52 |
| Langage | TypeScript | TypeScript | TypeScript |
| State | — | Zustand + TanStack Query v5 | Zustand + TanStack Query v5 |
| DB/ORM | PostgreSQL + Prisma 5 | — | — |
| Stockage | MinIO (S3) | MinIO (URLs publiques) | MinIO (URLs publiques) |
| Queue | BullMQ + Redis | — | — |
| Auth | JWT + OTP email | JWT (Zustand) | JWT (SecureStore) |
| Styling | — | Tailwind CSS v4 | StyleSheet RN + thème custom |
| Tests | Jest | — | — |

> Voir les CLAUDE.md spécifiques dans chaque app pour les règles détaillées.
