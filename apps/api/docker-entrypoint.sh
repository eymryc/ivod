#!/bin/sh
set -e

# ─── 1. Génération du client Prisma ──────────────────────────────────────────
echo "🔧  Generating Prisma client..."
npx prisma generate

# ─── 2. Application des migrations en attente ────────────────────────────────
echo "🗄️   Applying pending migrations..."
npx prisma migrate deploy

# ─── 3. Démarrage NestJS en hot-reload ───────────────────────────────────────
echo "🚀  Starting NestJS API (hot-reload)..."
exec npm run dev
