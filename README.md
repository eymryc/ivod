# iVOD — Monorepo

Plateforme iVOD (VOD) — **Web (Next.js)** + **API (NestJS + Prisma)** + **pipeline vidéo (BullMQ + ffmpeg + MinIO)**.

## Structure

```
ivod/
├── apps/
│   ├── api/          # API NestJS + Prisma + pipeline vidéo (MinIO/BullMQ)
│   ├── web/          # Web Next.js (port 3001)
│   └── mobile/       # Mobile (Expo) — si présent selon les branches
├── docs/             # Docs produit/tech (ex: VIDEO_PLATFORM.md)
├── Makefile          # Commandes dev/prod Docker + Prisma
└── .env.example      # Env infra Docker (ports/volumes)
```

## Prérequis

- **Node.js**: 20+
- **npm**: 10+
- **Docker Desktop** (recommandé) pour l’API + BDD + Redis + MinIO

## Démarrage rapide (dev)

### 1) Variables d’environnement

Créer les 2 fichiers suivants :

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Créer `apps/web/.env.local` (pas d’exemple commité) :

```bash
cat > apps/web/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
NEXT_PUBLIC_MINIO_ASSETS_BUCKET=ivod-assets
NEXT_PUBLIC_MINIO_VIDEOS_BUCKET=ivod-videos
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF
```

### 2) Lancer l’infra + l’API (Docker)

```bash
make dev-up
```

Services :

- API: `http://localhost:3000`
- Adminer: `http://localhost:8080`
- MinIO console: `http://localhost:9001`

### 3) Initialiser la base (Prisma)

```bash
make db-migrate
make db-seed
```

### 4) Lancer le Web (local)

```bash
cd apps/web
npm install
npm run dev
```

Web: `http://localhost:3001`

## API (NestJS) — ce que fait le repo

- **REST API** sous préfixe `API_PUBLIC_URL` (par défaut `http://localhost:3000/api/v1`)
- **DB**: PostgreSQL via Prisma
- **Queue jobs**: BullMQ + Redis
- **Stockage**: MinIO (S3 compatible) pour vidéos + assets
- **Pipeline vidéo**: probe → transcode preview (720p) → ladder complet → packaging HLS → poster/storyboard

Docs utiles :

- `docs/VIDEO_PLATFORM.md` (pipeline vidéo + variables d’env)
- `ARCHITECTURE.md` (vision globale plateforme)

## Web (Next.js)

- Next.js (App Router), dev sur `3001`
- Configure l’API via `NEXT_PUBLIC_API_URL`
- Utilise Socket.io via `NEXT_PUBLIC_WS_URL`
- Consomme MinIO (URLs publiques) via `NEXT_PUBLIC_MINIO_URL` + buckets

## Commandes Makefile (les plus utiles)

- **dev**: `make dev-up`, `make dev-down`, `make dev-clean`, `make dev-logs`
- **prisma**: `make db-generate`, `make db-migrate`, `make db-seed`, `make db-reset`, `make db-studio`

## Notes importantes

- **`make db-seed` regénère le client Prisma** avant d’exécuter `prisma/seed.ts` (évite l’erreur `Cannot find module '@prisma/client'`).
- En dev, **l’API + worker vidéo** tournent via Docker Compose (`apps/api/docker-compose.dev.yml`). Le Web tourne localement.
