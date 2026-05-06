# ─── Stage 1 : deps ──────────────────────────────────────────────────────────
# ALL workspace package.json must be present so npm ci hoists correctly.
# Used as-is by the dev compose (target: deps) — full deps incl. devDependencies.
FROM node:20-bookworm-slim AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json      ./apps/api/package.json
COPY apps/web/package.json      ./apps/web/package.json
COPY apps/mobile/package.json   ./apps/mobile/package.json
COPY packages/types/package.json  ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
RUN npm ci

# ─── Stage 2 : builder ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy package.json files (needed for workspace commands)
COPY package*.json ./
COPY apps/api/package.json      ./apps/api/package.json
COPY apps/web/package.json      ./apps/web/package.json
COPY apps/mobile/package.json   ./apps/mobile/package.json
COPY packages/types/package.json  ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/ui/package.json     ./packages/ui/package.json

# Copy sources
COPY tsconfig.json ./tsconfig.json
COPY apps/api ./apps/api
COPY packages/types ./packages/types

# Build shared types → generate Prisma client → build API
RUN npm run build --workspace @ivod/types \
  && npm run prisma:generate --workspace @ivod/api \
  && npm run build --workspace @ivod/api

# Prune dev dependencies (keep only production deps)
RUN npm prune --omit=dev --workspace @ivod/api

# ─── Stage 2 : runner ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only what is needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json

WORKDIR /app/apps/api

# Drop root privileges
USER node

EXPOSE 3000

# migrate deploy (idempotent) → seed (idempotent upserts) → start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
