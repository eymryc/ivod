# =============================================================================
# IVOD — API NestJS
# Stages : deps → development  (hot-reload)
#          deps → builder → production
# =============================================================================

# ─── Stage 1 : deps ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY apps/api/package.json ./

RUN npm install

# ─── Stage 2 : development ────────────────────────────────────────────────────
# Utilisé par docker-compose.dev.yml (target: development).
# Les sources (src/, prisma/) sont montées en volumes.
# L'entrypoint génère le client Prisma, applique les migrations, puis lance
# nest start --watch.
FROM node:20-bookworm-slim AS development

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl procps ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY apps/api/package.json            ./
COPY apps/api/nest-cli.json           ./
COPY apps/api/tsconfig.json           ./
COPY apps/api/tsconfig.build.json     ./

COPY apps/api/docker-entrypoint.sh         ./docker-entrypoint.sh
COPY apps/api/docker-entrypoint-worker.sh  ./docker-entrypoint-worker.sh
RUN chmod +x ./docker-entrypoint.sh ./docker-entrypoint-worker.sh

ENV NODE_ENV=development

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]

# ─── Stage 3 : builder ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY apps/api/package.json            ./
COPY apps/api/nest-cli.json           ./
COPY apps/api/tsconfig.json           ./
COPY apps/api/tsconfig.build.json     ./

COPY apps/api/src     ./src
COPY apps/api/prisma  ./prisma

# Génère le client Prisma (schéma disponible, devDeps présentes dans cette couche)
RUN node_modules/.bin/prisma generate

RUN npm run build

# ─── Stage 4 : production ─────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

# ffmpeg requis par le video-worker (transcodage HLS)
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

COPY apps/api/package.json ./

# prisma est en dependencies → disponible avec --omit=dev (migrate deploy au démarrage)
RUN npm install --omit=dev && npm cache clean --force

# App compilée depuis le builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Client Prisma généré (le builder a les devDeps pour generate)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Schéma + migrations (prisma migrate deploy au démarrage)
COPY --chown=nestjs:nodejs apps/api/prisma ./prisma

# Entrypoints de démarrage
COPY apps/api/docker-entrypoint-prod.sh        ./docker-entrypoint-prod.sh
COPY apps/api/docker-entrypoint-worker-prod.sh ./docker-entrypoint-worker-prod.sh
RUN chmod +x ./docker-entrypoint-prod.sh ./docker-entrypoint-worker-prod.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint-prod.sh"]
