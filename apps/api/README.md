# iVOD API (`apps/api`)

Backend iVOD : **NestJS + Prisma + PostgreSQL + Redis (BullMQ) + MinIO**.

## Démarrage (dev)

### Prérequis

- Node.js 20+ / npm 10+
- Docker Desktop (recommandé) — pour PostgreSQL/Redis/MinIO + conteneur API

### Variables d’environnement

- **Infra (racine)** : `cp ../../.env.example ../../.env`
- **API (ce dossier)** : `cp .env.example .env`

> En dev Docker, `apps/api/docker-compose.dev.yml` surcharge `DATABASE_URL`, `REDIS_URL`, MinIO, etc.

### Lancer l’API + infra (Docker)

Depuis la racine du repo :

```bash
make dev-up
```

Endpoints utiles :

- API : `http://localhost:3000` (base API : `http://localhost:3000/api/v1`)
- Adminer : `http://localhost:8080`
- MinIO console : `http://localhost:9001`

### Prisma (migrations + seed)

Depuis la racine du repo :

```bash
make db-migrate
make db-seed
```

Notes :

- `make db-seed` exécute `prisma/seed.ts`.
- `make db-generate` regénère le client Prisma et copie les types côté host (utile IDE).

## Pipeline vidéo (worker)

Le `docker-compose.dev.yml` démarre aussi `video-worker` (BullMQ + ffmpeg).

Doc : `../../docs/VIDEO_PLATFORM.md`

Variables d’env principales (voir `.env.example`) :

- `VIDEO_TWO_PHASE` (preview 720p avant ladder complet)
- `VIDEO_WORKER_CONCURRENCY`
- `VIDEO_CPU_PARALLEL`
- `VIDEO_HLS_SEGMENT_TYPE` (`ts` ou `fmp4` CMAF)

## Swagger / conventions

- Guide Swagger : `SWAGGER_GUIDE.md`

