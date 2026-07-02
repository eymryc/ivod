#!/usr/bin/env bash
# =============================================================================
# IVOD — Seed Prisma en production
#
# L'image API prod ne contient pas src/ ni tsconfig.json (dist/ uniquement),
# alors que prisma/seed.ts importe editorial-rails.seed.ts à la fin.
# Ce script copie src/ dans le container puis exécute le seed via ts-node.
#
# Usage (sur le serveur, depuis la racine du repo) :
#   ./scripts/prod-seed.sh
#   API_CONTAINER=ivod-api-2-prod ./scripts/prod-seed.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_CONTAINER="${API_CONTAINER:-ivod-api-1-prod}"
SCRIPT_TAG="prod-seed"

# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

[ -d "${PROJECT_DIR}/apps/api/src" ] || die "apps/api/src introuvable — lancez depuis la racine du repo"
docker inspect "${API_CONTAINER}" >/dev/null 2>&1 \
  || die "container ${API_CONTAINER} introuvable — la stack prod est-elle démarrée ?"

log "Copie de apps/api/src vers ${API_CONTAINER}:/app/src (requis par prisma/seed.ts)"
docker cp "${PROJECT_DIR}/apps/api/src" "${API_CONTAINER}:/app/src"

log "Exécution du seed dans ${API_CONTAINER} (1–2 min)..."
docker exec "${API_CONTAINER}" sh -c \
  'npx --yes ts-node@10.9.2 --transpile-only --skip-project /app/prisma/seed.ts'

log "Seed terminé."
