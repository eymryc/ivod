# syntax=docker/dockerfile:1.10
# =============================================================================
# IVOD — Web Next.js  (context : apps/web/)
#
# Stages :
#   base       → image Alpine commune
#   deps       → npm ci (lockfile présent : package-lock.json)
#   builder    → next build (output: 'standalone', voir next.config.ts)
#   production → image finale : .next/standalone + .next/static + public
#
# Les NEXT_PUBLIC_* sont inlinées dans le bundle JS AU BUILD (et re-résolues
# dans .next/required-server-files.json pour les rewrites/headers) — donc
# passées comme build ARGs, pas comme variables runtime. Voir
# apps/web/docker-compose.prod.yml (build.args).
# =============================================================================

ARG NODE_VERSION=20-alpine3.21

# ─── base : outils système partagés ───────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

# ─── deps : installation npm (lockfile présent → npm ci reproductible) ────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ─── builder : next build ──────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked au build (bundle JS client + manifeste standalone) — voir next.config.ts
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_MINIO_URL
ARG NEXT_PUBLIC_MINIO_ASSETS_BUCKET
ARG NEXT_PUBLIC_MINIO_VIDEOS_BUCKET
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
# Origine interne Docker pour le rewrite serveur /media (next.config.ts) — http://api_1:3000
ARG API_REWRITE_ORIGIN
# Doit correspondre à JWT_SECRET de l'API — voir limite en bas de fichier
ARG JWT_VERIFY_SECRET

ENV NODE_ENV=production \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_MINIO_URL=$NEXT_PUBLIC_MINIO_URL \
    NEXT_PUBLIC_MINIO_ASSETS_BUCKET=$NEXT_PUBLIC_MINIO_ASSETS_BUCKET \
    NEXT_PUBLIC_MINIO_VIDEOS_BUCKET=$NEXT_PUBLIC_MINIO_VIDEOS_BUCKET \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    API_REWRITE_ORIGIN=$API_REWRITE_ORIGIN \
    JWT_VERIFY_SECRET=$JWT_VERIFY_SECRET

RUN npm run build

# ─── production : image finale minimale ───────────────────────────────────────
FROM node:${NODE_VERSION} AS production

LABEL org.opencontainers.image.title="ivod-web" \
      org.opencontainers.image.description="IVOD — Web Next.js (standalone)"

RUN apk add --no-cache dumb-init \
 && addgroup -g 1001 -S nodejs \
 && adduser  -S -u 1001 -G nodejs nextjs

WORKDIR /app

# JWT_VERIFY_SECRET : passé aussi en variable runtime (voir docker-compose) —
# ceinture et bretelles, cf. commentaire de limite dans docker-compose.prod.yml
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0

# ── 1. Assets statiques publics
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
# ── 2. Serveur standalone (node_modules tracés + server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# ── 3. Assets statiques buildés (JS/CSS versionnés — non inclus dans standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
