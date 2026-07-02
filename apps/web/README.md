# iVOD Web (`apps/web`)

Frontend iVOD : **Next.js (App Router)**.

## Démarrage (dev)

### 1) Démarrer l’API (Docker)

Depuis la racine du repo :

```bash
make dev-up
make db-migrate
make db-seed
```

### 2) Configurer l’environnement du Web

Créer `apps/web/.env.local` :

```bash
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
NEXT_PUBLIC_MINIO_ASSETS_BUCKET=ivod-assets
NEXT_PUBLIC_MINIO_VIDEOS_BUCKET=ivod-videos
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF
```

### 3) Lancer le Web

```bash
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:3001`.

## Config (API / WS / MinIO)

Le Web utilise :

- `NEXT_PUBLIC_API_URL` (base REST, ex: `http://localhost:3000/api/v1`)
- `NEXT_PUBLIC_WS_URL` (Socket.io, ex: `http://localhost:3000`)
- `NEXT_PUBLIC_MINIO_URL` + buckets (affichage images / assets)

Les valeurs par défaut existent aussi dans le code :

- `apps/web/lib/config/api.ts`
