#!/usr/bin/env bash
# =============================================================================
# IVOD — Rebuild Docker production (zero-downtime)
#
# À exécuter SUR LE SERVEUR dans /var/www/ivod.
# Le code doit déjà être à jour sur disque (rsync via GitHub Actions ou
# make remote-deploy).
#
# Usage : ./deploy.sh [--s3]
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

SCRIPT_TAG="deploy"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/deploy-core.sh
source "${PROJECT_DIR}/scripts/lib/deploy-core.sh"

INCLUDE_S3=""
[ "${1:-}" = "--s3" ] && INCLUDE_S3="-f apps/api/docker-compose.s3-external.yml"

# shellcheck disable=SC2046
COMPOSE="$(compose_cmd "${INCLUDE_S3}")"

log "Rebuild de la stack Docker (révision : $(git rev-parse --short HEAD 2>/dev/null || echo 'rsync'))..."
run_prod_deploy 30 2
log "Déploiement terminé."
