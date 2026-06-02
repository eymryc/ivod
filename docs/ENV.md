# Variables d'environnement IVOD

## `.env` (racine)

Uniquement pour **docker-compose** : Postgres, Redis, MinIO, ports, options vidéo partagées worker.

## `apps/api/.env`

Toute la config **API NestJS** : JWT, Paystack, SMTP, MinIO (URLs), Redis, pipeline vidéo.

Avec `make dev-up`, ce fichier est chargé dans le container (`env_file`). Compose **surcharge** uniquement :

- `DATABASE_URL` → `postgres:5432`
- `REDIS_URL` → `redis://redis:6379`
- `MINIO_ENDPOINT` → `minio`

## `apps/web/.env.local` (à part)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
```

## Variables retirées (non utilisées par le code)

Mux, Stripe, CinetPay, OneSignal, Upstash, MTN — retirés des `.env` tant qu’aucun module ne les lit.
