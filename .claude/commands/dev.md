# Guide de démarrage iVOD — Tous les services

## Démarrage complet

```bash
# 1. Infrastructure Docker (API + worker + DB + Redis + MinIO + Adminer)
docker compose -f apps/api/docker-compose.dev.yml up -d

# Attendre que tout soit healthy (~15-20s)
docker ps --format "table {{.Names}}\t{{.Status}}"

# 2. Web Next.js (terminal séparé)
cd apps/web && pnpm dev   # ou npm run dev → port 3001

# 3. Mobile Expo (terminal séparé, optionnel)
cd apps/mobile && npx expo start
```

## Accès rapide

| Service | URL | Identifiants |
|---|---|---|
| API | http://localhost:3000/api/v1 | — |
| Swagger | http://localhost:3000/api/v1/docs | — |
| Web | http://localhost:3001 | — |
| Adminer (DB) | http://localhost:8080 | Serveur: postgres, User: ivod, Pass: password, DB: ivod |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

## État des containers

```bash
# Statut global
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Logs API en direct
docker logs -f ivod-api-dev

# Logs worker vidéo
docker logs -f ivod-video-worker-dev

# Logs toutes les apps
docker compose -f apps/api/docker-compose.dev.yml logs -f
```

## Opérations courantes

```bash
# Redémarrer l'API après modif TypeScript
docker restart ivod-api-dev

# Arrêter tout
docker compose -f apps/api/docker-compose.dev.yml down

# Arrêter et nettoyer les données
docker compose -f apps/api/docker-compose.dev.yml down -v

# Shell dans l'API
docker exec -it ivod-api-dev sh

# Requête DB rapide
psql postgresql://ivod:password@localhost:5432/ivod -c "SELECT COUNT(*) FROM banners;"

# Générer Prisma client (après modif schema)
docker exec ivod-api-dev npx prisma generate
```

## Troubleshooting fréquent

**API ne démarre pas** → `docker logs ivod-api-dev | tail -30`
**Prisma type error** → `docker exec ivod-api-dev npx prisma generate && docker restart ivod-api-dev`
**Web sur port 3001 en erreur** → vérifier que l'API tourne sur 3000 (`curl http://localhost:3000/api/v1/health`)
**Expo can't connect API** → vérifier `EXPO_PUBLIC_API_URL` dans `apps/mobile/.env` (utiliser IP LAN, pas localhost sur device physique)
