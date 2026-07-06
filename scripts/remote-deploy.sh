#!/usr/bin/env bash
# =============================================================================
# iVOD — Déploiement manuel (secours)
#
# Reproduit le job CD de GitHub Actions en local.
# À utiliser lorsque Actions est indisponible (billing, incident, debug).
#
# Usage :
#   make remote-deploy
#   ./scripts/remote-deploy.sh --dry-run
#
# Variables :
#   REMOTE_HOST — défaut : root@ivod-preprod-srv01.xselcloud.com
#   REMOTE_DIR  — défaut : /var/www/ivod
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

export PROD_USER="${REMOTE_HOST%%@*}"
export PROD_HOST="${REMOTE_HOST#*@}"
export PROD_APP_DIR="${REMOTE_DIR}"
export PROD_PORT="${PROD_PORT:-22}"

log "Vérification de la connexion SSH vers ${REMOTE_HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" true \
  || die "connexion SSH impossible — vérifiez : ssh ${REMOTE_HOST}"

if [ -n "${DRY_RUN}" ]; then
  export SSH_KEY_FILE="/dev/null"
  log "Prévisualisation du transfert (dry-run)..."
  rsync -avzn \
    --exclude-from="${LOCAL_DIR}/scripts/lib/rsync-excludes.txt" \
    -e ssh "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"
  exit 0
fi

log "Transfert du code..."
"${LOCAL_DIR}/scripts/rsync-to-server.sh"

log "Rebuild Docker sur le serveur..."
ssh "${REMOTE_HOST}" "cd '${REMOTE_DIR}' && ./deploy.sh"

log "Déploiement terminé."
