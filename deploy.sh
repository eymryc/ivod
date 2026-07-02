#!/usr/bin/env bash
# =============================================================================
# iVOD — Rebuild de la stack Docker (production)
#
# Exécuter sur le serveur, dans /var/www/ivod.
# Le code doit déjà être présent (transféré par le pipeline CD ou remote-deploy).
#
# Étapes :
#   1. Préparation des répertoires (logs, réseau Docker)
#   2. Rolling update api_1 → api_2 (zero-downtime)
#   3. Recréation du worker vidéo et du web
#   4. Reload Nginx si la configuration est valide
#
# Usage :
#   ./deploy.sh          # stack standard (MinIO local)
#   ./deploy.sh --s3     # avec stockage S3 externe (Wasabi/Backblaze)
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

log "Démarrage du rebuild Docker..."
run_prod_deploy 30 2
log "Rebuild terminé."
