#!/usr/bin/env bash
# =============================================================================
# IVOD — Déploiement distant (rsync + rebuild Docker)
#
# Méthode recommandée quand GitHub Actions est indisponible (billing, secrets…)
# ou pour un déploiement immédiat depuis votre machine locale.
#
# Enchaîne : rsync du code → ./deploy.sh --no-sync sur le serveur.
# Ne dépend PAS d'un git remote fonctionnel côté serveur.
#
# Usage :
#   ./scripts/remote-deploy.sh              # déploie la branche locale courante
#   ./scripts/remote-deploy.sh --dry-run    # prévisualise le rsync
#
# Variables :
#   REMOTE_HOST=root@ivod-preprod-srv01.xselcloud.com
#   REMOTE_DIR=/var/www/ivod
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

EXCLUDES_FILE="${LOCAL_DIR}/scripts/lib/rsync-excludes.txt"
[ -f "${EXCLUDES_FILE}" ] || die "fichier d'exclusions rsync introuvable : ${EXCLUDES_FILE}"

log "Test de connexion à ${REMOTE_HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" true \
  || die "connexion SSH impossible — testez : ssh ${REMOTE_HOST}"

log "Transfert du code vers ${REMOTE_HOST}:${REMOTE_DIR}${DRY_RUN:+ (dry-run)}"

RSYNC_EXCLUDES=()
while IFS= read -r line || [ -n "${line}" ]; do
  line="${line%%#*}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [ -n "${line}" ] || continue
  RSYNC_EXCLUDES+=(--exclude "${line}")
done < "${EXCLUDES_FILE}"

rsync -avz ${DRY_RUN} \
  "${RSYNC_EXCLUDES[@]}" \
  "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"

if [ -n "${DRY_RUN}" ]; then
  log "Dry-run terminé."
  exit 0
fi

COMMIT_SHA="$(git -C "${LOCAL_DIR}" rev-parse --short HEAD 2>/dev/null || echo 'local')"
log "Rebuild Docker sur le serveur (commit local : ${COMMIT_SHA})..."
ssh "${REMOTE_HOST}" "cd '${REMOTE_DIR}' && ./deploy.sh --no-sync"

log "Déploiement distant terminé."
