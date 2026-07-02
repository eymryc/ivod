#!/usr/bin/env bash
# =============================================================================
# IVOD — Déploiement production (zero-downtime API)
#
# À exécuter SUR LE SERVEUR dans /var/www/ivod.
#
# Usage :
#   ./deploy.sh [branche|sha] [--s3] [--no-sync]
#
# Modes de synchronisation du code :
#   (défaut)     git fetch + reset — nécessite un remote origin valide
#   --no-sync    saute git — le code est déjà à jour (rsync CI ou remote-deploy)
#
# Variables :
#   GIT_REMOTE_URL  URL du dépôt (défaut : déduit ou https://github.com/eymryc/ivod.git)
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

SCRIPT_TAG="deploy"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/sync-git.sh
source "${PROJECT_DIR}/scripts/lib/sync-git.sh"
# shellcheck source=scripts/lib/deploy-core.sh
source "${PROJECT_DIR}/scripts/lib/deploy-core.sh"

BRANCH="main"
INCLUDE_S3=""
NO_SYNC=""

for arg in "$@"; do
  case "$arg" in
    --s3) INCLUDE_S3="-f apps/api/docker-compose.s3-external.yml" ;;
    --no-sync) NO_SYNC="1" ;;
    --*) die "option inconnue : ${arg}" ;;
    *) BRANCH="$arg" ;;
  esac
done

HEALTH_TIMEOUT_TRIES=30
HEALTH_POLL_INTERVAL=2

# ── 1. Synchronisation du code ───────────────────────────────────────────────
if [ -n "${NO_SYNC}" ]; then
  log "Mode --no-sync : le code sur disque est supposé à jour (rsync/CI)."
  if git rev-parse --short HEAD >/dev/null 2>&1; then
    log "Révision git locale : $(git rev-parse --short HEAD)"
  fi
else
  GIT_REMOTE_URL="${GIT_REMOTE_URL:-https://github.com/eymryc/ivod.git}"
  sync_from_git "${BRANCH}"
fi

# shellcheck disable=SC2046
COMPOSE="$(compose_cmd "${INCLUDE_S3}")"

# ── 2. Rolling update ─────────────────────────────────────────────────────────
run_prod_deploy "${HEALTH_TIMEOUT_TRIES}" "${HEALTH_POLL_INTERVAL}"

log "Déploiement terminé."
