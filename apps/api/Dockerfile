# syntax=docker/dockerfile:1.10
# =============================================================================
# IVOD — API NestJS  (context : apps/api/)
#
# Stages :
#   base      → image Alpine commune, outils système
#   deps      → npm install (dev + prod)
#   prod-deps → prune devDeps (pas de téléchargement au runtime)
#   dev       → hot-reload, sources montées en volume
#   builder   → compilation TS + génération client Prisma
#   production→ image finale : dist + prod-deps + prisma client
# =============================================================================

ARG NODE_VERSION=20-alpine3.21

# ─── base : outils système partagés ───────────────────────────────────────────
FROM node:${NODE_VERSION} AS base

# dumb-init  : PID 1 correct → SIGTERM propagé au process enfant
# openssl    : requis par Prisma (chiffrement connexions BDD)
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

# ─── deps : installation npm complète (dev + prod) ────────────────────────────
FROM base AS deps

COPY package.json ./

# --mount=type=cache → le registre npm est mis en cache entre les builds
# Ajouter package-lock.json et remplacer par "npm ci" pour des builds reproductibles
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ─── prod-deps : suppression des devDependencies ──────────────────────────────
# Évite de télécharger des packages au démarrage du container de production
FROM deps AS prod-deps

RUN npm prune --omit=dev

# ─── dev : hot-reload (sources montées en volume) ─────────────────────────────
FROM base AS development

# procps + ffmpeg uniquement nécessaires en développement
RUN apk add --no-cache procps ffmpeg

COPY --from=deps /app/node_modules ./node_modules

# Config d'abord → couches rarement invalidées
COPY package.json         ./
COPY nest-cli.json        ./
COPY tsconfig.json        ./
COPY tsconfig.build.json  ./
COPY tsconfig.worker.json ./

COPY docker-entrypoint.sh        ./
COPY docker-entrypoint-worker.sh ./
RUN chmod +x docker-entrypoint.sh docker-entrypoint-worker.sh

ENV NODE_ENV=development

EXPOSE 3000

# dumb-init comme PID 1, remplacé par le process Node via exec dans le script
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]

# ─── builder : compilation TypeScript ─────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

# Config d'abord → meilleures réutilisation du cache
COPY package.json         ./
COPY nest-cli.json        ./
COPY tsconfig.json        ./
COPY tsconfig.build.json  ./
COPY tsconfig.worker.json ./

# Sources ensuite → couche invalidée uniquement si le code change
COPY src    ./src
COPY prisma ./prisma

# Génération du client Prisma (nécessite les devDeps présentes à cette étape)
RUN node_modules/.bin/prisma generate \
 && npm run build

# ─── production : image finale minimale ───────────────────────────────────────
FROM node:${NODE_VERSION} AS production

LABEL org.opencontainers.image.title="ivod-api" \
      org.opencontainers.image.description="IVOD — API NestJS + BullMQ video worker"

# ffmpeg requis par le video-worker pour le transcodage HLS
RUN apk add --no-cache dumb-init openssl ffmpeg \
 && addgroup -g 1001 -S nodejs \
 && adduser  -S -u 1001 -G nodejs nestjs

WORKDIR /app

ENV NODE_ENV=production

# ── 1. Dépendances prod (pas de npm install ici, pas d'accès réseau nécessaire)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules         ./node_modules

# ── 2. Client Prisma généré (le builder a les devDeps pour prisma generate)
#       Écrase le dossier .prisma dans les node_modules copiés depuis prod-deps
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma   ./node_modules/.prisma

# ── 3. Application compilée
COPY --from=builder --chown=nestjs:nodejs /app/dist                   ./dist

# ── 4. Schéma + migrations (prisma migrate deploy au démarrage)
COPY --chown=nestjs:nodejs prisma      ./prisma

# ── 5. package.json (référencé par certains scripts de démarrage)
COPY --chown=nestjs:nodejs package.json ./

# ── 6. Entrypoints (copiés avant USER nestjs pour pouvoir chmod)
COPY docker-entrypoint-prod.sh        ./
COPY docker-entrypoint-worker-prod.sh ./
RUN chmod +x docker-entrypoint-prod.sh docker-entrypoint-worker-prod.sh

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint-prod.sh"]
