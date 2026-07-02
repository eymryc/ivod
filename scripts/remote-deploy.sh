#!/usr/bin/env bash
# =============================================================================
# IVOD — Fallback local (même flux que GitHub Actions deploy.yml)
#
# À utiliser uniquement si Actions est indisponible (billing, debug urgent).
# Usage : make remote-deploy
# =============================================================================

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@ivod-preprod-srv01.xselcloud.com}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/ivod}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROJECT_DIR="${LOCAL_DIR}"
SCRIPT_TAG="remote-deploy"
# shellcheck source=scripts/lib/common.sh
source "${LOCAL_DIR}/scripts/lib/common.sh"

DRY_RUN=""
[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run"

# Dérive PROD_USER@PROD_HOST depuis REMOTE_HOST
PROD_USER="${REMOTE_HOST%%@*}"
PROD_HOST="${REMOTE_HOST#*@}"
export PROD_HOST PROD_USER
export PROD_APP_DIR="${REMOTE_DIR}"
export PROD_PORT="${PROD_PORT:-22}"

log "Test de connexion à ${REMOTE_HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" true \
  || die "connexion SSH impossible — testez : ssh ${REMOTE_HOST}"

if [ -n "${DRY_RUN}" ]; then
  log "Dry-run rsync vers ${REMOTE_HOST}:${REMOTE_DIR}"
  # shellcheck disable=SC2086
  rsync -avz --dry-run -e ssh \
    --exclude-from="${LOCAL_DIR}/scripts/lib/rsync-excludes.txt" \
    "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"
  exit 0
fi

log "Rsync + rebuild (identique au job Deploy GitHub Actions)..."
"${LOCAL_DIR}/scripts/rsync-to-server.sh"
ssh "${REMOTE_HOST}" "cd '${REMOTE_DIR}' && ./deploy.sh"
log "Terminé."
