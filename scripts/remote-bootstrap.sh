#!/usr/bin/env bash
# =============================================================================
# iVOD — Première mise en route du serveur de production
#
# À exécuter UNE SEULE FOIS depuis votre machine locale.
# Les déploiements suivants passent par GitHub Actions (push sur main)
# ou, en secours, par make remote-deploy.
#
# Étapes :
#   1. Transfert du code (rsync)
#   2. Copie de apps/api/.env.production → apps/api/.env (si absent)
#   3. Bootstrap serveur (Docker, TLS, stack, seed, smoke test)
#
# Usage :
#   make remote-bootstrap
#   ./scripts/remote-bootstrap.sh --dry-run
#
# Prérequis :
#   - Accès SSH par clé vers le serveur
#   - apps/api/.env.production rempli localement (SMTP, Paystack)
# =============================================================================

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@ivod-preprod-srv01.xselcloud.com}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/ivod}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROJECT_DIR="${LOCAL_DIR}"
SCRIPT_TAG="remote-bootstrap"
# shellcheck source=scripts/lib/common.sh
source "${LOCAL_DIR}/scripts/lib/common.sh"

DRY_RUN=""
[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run"

[ -f "${LOCAL_DIR}/apps/api/.env.production" ] \
  || die "apps/api/.env.production manquant — remplissez SMTP et Paystack avant de continuer"

# ── 1. Connexion SSH ────────────────────────────────────────────────────────
log "Connexion SSH vers ${REMOTE_HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" true \
  || die "connexion impossible — testez : ssh ${REMOTE_HOST}"

# ── 2. Répertoire de destination ─────────────────────────────────────────────
if [ -z "${DRY_RUN}" ]; then
  log "Création de ${REMOTE_DIR} (si absent)"
  ssh "${REMOTE_HOST}" "mkdir -p '${REMOTE_DIR}'"
fi

# ── 3. Transfert du code ─────────────────────────────────────────────────────
export PROD_USER="${REMOTE_HOST%%@*}"
export PROD_HOST="${REMOTE_HOST#*@}"
export PROD_APP_DIR="${REMOTE_DIR}"
export PROD_PORT="${PROD_PORT:-22}"

if [ -n "${DRY_RUN}" ]; then
  log "Prévisualisation du transfert (dry-run)..."
  rsync -avzn \
    --exclude-from="${LOCAL_DIR}/scripts/lib/rsync-excludes.txt" \
    -e ssh "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"
  log "Dry-run terminé."
  exit 0
fi

log "Transfert du code vers ${REMOTE_DIR}"
"${LOCAL_DIR}/scripts/rsync-to-server.sh"

# ── 4. Fichier d'environnement ───────────────────────────────────────────────
log "Vérification de apps/api/.env"
ssh "${REMOTE_HOST}" \
  "cd '${REMOTE_DIR}' && [ -f apps/api/.env ] && echo 'existe' || (cp apps/api/.env.production apps/api/.env && echo 'copié')"

# ── 5. Bootstrap serveur ─────────────────────────────────────────────────────
log "Bootstrap serveur (peut prendre plusieurs minutes)..."
ssh -t "${REMOTE_HOST}" "cd '${REMOTE_DIR}' && sudo ./scripts/bootstrap-server.sh"

log "Bootstrap terminé. Déploiements suivants : git push origin main"
