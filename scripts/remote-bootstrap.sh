#!/usr/bin/env bash
# =============================================================================
# IVOD — Bootstrap distant (à lancer DEPUIS VOTRE MACHINE LOCALE, pas le serveur)
#
# Enchaîne : rsync du code → copie du .env de prod (si absent sur le serveur,
# ne remplace jamais un .env déjà en place) → exécution de
# scripts/bootstrap-server.sh sur le serveur via SSH.
#
# ⚠️  Pour la PREMIÈRE mise en route uniquement. Les déploiements suivants
# passent par ./deploy.sh (exécuté SUR le serveur, via git fetch/reset —
# source de vérité auditable, pas un rsync ad-hoc depuis un poste local).
#
# Prérequis :
#   - Accès SSH par clé déjà configuré vers le serveur (pas de mot de passe
#     interactif géré ici)
#   - apps/api/.env.production rempli localement (SMTP/Paystack)
#
# Usage :
#   ./scripts/remote-bootstrap.sh              # exécution réelle
#   ./scripts/remote-bootstrap.sh --dry-run    # prévisualise le rsync, ne touche à rien
#
# Variables surchargeables :
#   REMOTE_HOST=root@ivod-preprod-srv01.xselcloud.com
#   REMOTE_DIR=/var/www/ivod
#   GIT_REMOTE_URL=<déduit automatiquement de `git remote get-url origin` en local>
#   GIT_BRANCH=main
# =============================================================================

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@ivod-preprod-srv01.xselcloud.com}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/ivod}"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-$(git -C "${LOCAL_DIR}" remote get-url origin 2>/dev/null || true)}"

# common.sh attend PROJECT_DIR (nommé LOCAL_DIR ici par clarté — ce script
# tourne en local, "PROJECT_DIR" prêterait à confusion avec le serveur).
PROJECT_DIR="${LOCAL_DIR}"
SCRIPT_TAG="remote-bootstrap"
# shellcheck source=scripts/lib/common.sh
source "${LOCAL_DIR}/scripts/lib/common.sh"

DRY_RUN=""
[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run"

[ -f "${LOCAL_DIR}/apps/api/.env.production" ] || die "apps/api/.env.production manquant localement — rien à transférer"

# ── 1. Test de connexion SSH ─────────────────────────────────────────────────
log "Test de connexion à ${REMOTE_HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" true \
  || die "connexion SSH impossible (clé non configurée ? host injoignable ?) — testez manuellement : ssh ${REMOTE_HOST}"

# ── 2. Créer le dossier de destination s'il n'existe pas ────────────────────
# rsync ne crée pas les dossiers parents manquants (ex: /var/www n'existe pas
# sur un AlmaLinux fraîchement installé sans httpd — cette stack est 100%
# Docker, /var/www n'a jamais de raison d'exister par défaut).
if [ -z "${DRY_RUN}" ]; then
  log "Création de ${REMOTE_DIR} sur le serveur (si absent)"
  ssh "${REMOTE_HOST}" "mkdir -p '${REMOTE_DIR}'"
fi

# ── 3. Transfert du code ─────────────────────────────────────────────────────
log "Transfert du code vers ${REMOTE_HOST}:${REMOTE_DIR}${DRY_RUN:+ (dry-run)}"

# Exclusions : jamais écraser les secrets/certs/données déjà présents côté
# serveur avec ce qui traîne en local (pas de --delete : un rsync ne doit pas
# supprimer des fichiers générés côté serveur après coup, ex: certs renouvelés).
rsync -avz ${DRY_RUN} \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.turbo' \
  --exclude 'dist' \
  --exclude 'apps/*/logs' \
  --exclude 'apps/api/backups' \
  --exclude 'apps/api/certbot-webroot' \
  --exclude 'apps/api/nginx/ssl/*.pem' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.DS_Store' \
  "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"

if [ -n "${DRY_RUN}" ]; then
  log "Dry-run terminé — rien n'a été transféré ni exécuté sur le serveur."
  exit 0
fi

# ── 4. Initialise / répare le dépôt git côté serveur ─────────────────────────
# rsync exclut .git — deploy.sh a besoin d'un remote origin valide SAUF en
# mode --no-sync (utilisé par remote-deploy.sh et la CI). On répare ici les
# dépôts cassés (git init vide sans remote, cas observé en prod).
[ -n "${GIT_REMOTE_URL}" ] || die "impossible de déduire l'URL du remote git — définissez GIT_REMOTE_URL explicitement"
log "Vérification / réparation du dépôt git (remote: ${GIT_REMOTE_URL}, branche: ${GIT_BRANCH})"
ssh "${REMOTE_HOST}" "
  set -e
  command -v git >/dev/null 2>&1 || dnf install -y git
  git config --global --add safe.directory '${REMOTE_DIR}'
  export GIT_REMOTE_URL='${GIT_REMOTE_URL}'
  export GIT_BRANCH='${GIT_BRANCH}'
  cd '${REMOTE_DIR}'
  if [ -d .git ] && ! git remote get-url origin >/dev/null 2>&1; then
    echo 'Dépôt git sans remote — suppression et réinitialisation'
    rm -rf .git
  fi
  if [ -d .git ] && ! git rev-parse HEAD >/dev/null 2>&1; then
    echo 'Dépôt git sans commit — suppression et réinitialisation'
    rm -rf .git
  fi
  if [ ! -d .git ]; then
    git init -q
    git remote add origin \"\${GIT_REMOTE_URL}\"
    git fetch origin \"\${GIT_BRANCH}\"
    git checkout -f -B \"\${GIT_BRANCH}\" \"origin/\${GIT_BRANCH}\"
    echo 'Dépôt git initialisé.'
  else
    echo 'Dépôt git OK (remote + commit présents).'
  fi
"

# ── 5. .env de prod — copié seulement s'il n'existe pas déjà côté serveur ───
log "Vérification de apps/api/.env sur le serveur"
ssh "${REMOTE_HOST}" "cd ${REMOTE_DIR} && [ -f apps/api/.env ] && echo EXISTS || (cp apps/api/.env.production apps/api/.env && echo COPIED)"

# ── 6. Bootstrap serveur (root, idempotent) ─────────────────────────────────
log "Exécution de scripts/bootstrap-server.sh sur le serveur (sudo, peut prendre plusieurs minutes)"
ssh -t "${REMOTE_HOST}" "cd ${REMOTE_DIR} && sudo ./scripts/bootstrap-server.sh"

log "Terminé. Déploiements suivants :
  - Depuis votre Mac : ./scripts/remote-deploy.sh  (recommandé, rsync + rebuild)
  - Sur le serveur    : ./deploy.sh main            (git fetch + rebuild)
  - Via GitHub Actions: push sur main → job deploy-server (rsync + rebuild)"
