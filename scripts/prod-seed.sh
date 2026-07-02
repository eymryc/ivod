#!/usr/bin/env bash
# =============================================================================
# iVOD — Initialisation de la base de données (production)
#
# L'image API de production ne contient que dist/ (pas de src/ ni tsconfig).
# Le seed importe editorial-rails.seed.ts — ce script copie src/ dans le
# conteneur avant d'exécuter prisma/seed.ts via ts-node.
#
# Usage (sur le serveur) :
#   make prod-db-seed
#   API_CONTAINER=ivod-api-2-prod ./scripts/prod-seed.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_CONTAINER="${API_CONTAINER:-ivod-api-1-prod}"
SCRIPT_TAG="prod-seed"

# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

[ -d "${PROJECT_DIR}/apps/api/src" ] \
  || die "apps/api/src introuvable — exécutez depuis la racine du dépôt"
docker inspect "${API_CONTAINER}" >/dev/null 2>&1 \
  || die "conteneur ${API_CONTAINER} introuvable — la stack est-elle démarrée ?"

log "Copie de src/ vers ${API_CONTAINER}:/app/src"
docker cp "${PROJECT_DIR}/apps/api/src" "${API_CONTAINER}:/app/src"

log "Exécution du seed (1 à 2 minutes)..."
docker exec "${API_CONTAINER}" sh -c \
  'npx --yes ts-node@10.9.2 --transpile-only --skip-project /app/prisma/seed.ts'

log "Seed terminé."
