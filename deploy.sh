#!/usr/bin/env bash
# =============================================================================
# IVOD — Déploiement production (zero-downtime API)
#
# À exécuter DEPUIS LE SERVEUR, dans le dossier du projet (/var/www/ivod).
# Suppose : apps/api/.env déjà rempli, certificats déjà en place dans
# apps/api/nginx/ssl/ (voir docs/DEPLOY.md section 1).
#
# Usage :
#   ./deploy.sh [branche] [--s3]
#     branche   défaut : main
#     --s3      inclut docker-compose.s3-external.yml (Wasabi/Backblaze)
#
# Étapes :
#   1. git fetch + reset --hard sur la branche cible (refuse si modifs locales)
#   2. Prépare les dossiers de logs / webroot ACME (make prod-setup)
#   3. Rolling update api_1 puis api_2 : recrée une instance, ATTEND qu'elle
#      soit "healthy" avant de toucher à l'autre — Nginx (least_conn +
#      max_fails/fail_timeout) bascule le trafic sur l'instance saine pendant
#      ce temps (voir apps/api/nginx/nginx.prod.conf)
#   4. Recrée video-worker puis web (coupure courte acceptée — pas dédoublés)
#   5. nginx -t && nginx -s reload SEULEMENT si la config est valide (sinon
#      l'ancienne config reste active, pas de risque de casser un déploiement
#      en cours à cause d'une erreur de syntaxe Nginx)
#
# Pas de rollback automatique : en cas d'échec (ex. api_2 jamais "healthy"),
# le script s'arrête (set -e) en laissant l'ancienne instance en place.
# Rollback manuel : git checkout <sha-précédent> && ./deploy.sh <sha-précédent>
# =============================================================================

set -euo pipefail

BRANCH="main"
INCLUDE_S3=""
for arg in "$@"; do
  case "$arg" in
    --s3) INCLUDE_S3="-f apps/api/docker-compose.s3-external.yml" ;;
    *) BRANCH="$arg" ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

SCRIPT_TAG="deploy"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

HEALTH_TIMEOUT_TRIES=30   # 30 x 2s = 60s max d'attente par instance
HEALTH_POLL_INTERVAL=2

# shellcheck disable=SC2046
COMPOSE="$(compose_cmd "${INCLUDE_S3}")"

# ── 1. Synchronisation du code ───────────────────────────────────────────────
# "${BRANCH}" accepte aussi bien un nom de branche qu'un SHA de commit (pour
# un rollback manuel : ./deploy.sh <sha-précédent>) — on ne peut donc pas
# faire `git fetch origin "${BRANCH}"` ni `origin/${BRANCH}` sans distinguer
# les deux cas.
log "Récupération de ${BRANCH}..."
git fetch origin

if ! git diff --quiet HEAD; then
  die "modifications locales non commitées détectées sur ${PROJECT_DIR} — annulation (vérifier 'git status')."
fi

git checkout "${BRANCH}"
if git show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
  git reset --hard "origin/${BRANCH}"   # branche connue du remote — prend le dernier commit poussé
else
  git reset --hard "${BRANCH}"          # SHA ou tag précis (rollback) — déjà téléchargé par le fetch
fi
log "Code à jour sur $(git rev-parse --short HEAD)."

# ── 2. Dossiers requis (logs par instance, webroot ACME) ────────────────────
make prod-setup

# ── 3. Rolling update API — une instance à la fois ───────────────────────────
deploy_api_instance() {
  local svc="$1" container="$2"
  log "Redéploiement de ${svc} (${container})..."
  # --no-deps : ne touche pas à postgres/redis/minio, déjà en service
  $COMPOSE up -d --no-deps --build "${svc}"
  log "Attente de l'état healthy de ${container}..."
  # "die" en timeout : un rolling update en cours doit s'arrêter net plutôt
  # que de continuer vers l'instance suivante dans un état incertain.
  wait_healthy "${container}" "${HEALTH_TIMEOUT_TRIES}" "${HEALTH_POLL_INTERVAL}" die
  log "${container} healthy — bascule effective, passage à l'instance suivante."
}

deploy_api_instance api_1 ivod-api-1-prod
deploy_api_instance api_2 ivod-api-2-prod

# ── 4. Worker vidéo + Web (une seule instance chacun, coupure courte) ───────
log "Redéploiement du worker vidéo..."
$COMPOSE up -d --no-deps --build video-worker

log "Redéploiement du web..."
$COMPOSE up -d --no-deps --build web

# ── 5. Nginx — reload uniquement si la config est valide ────────────────────
log "Vérification de la config Nginx avant reload..."
if docker exec ivod-nginx-prod nginx -t; then
  docker exec ivod-nginx-prod nginx -s reload
  log "Nginx rechargé (config valide)."
else
  warn "config Nginx invalide — reload ignoré, l'ancienne config reste active."
fi

log "Déploiement terminé sur $(git rev-parse --short HEAD)."
$COMPOSE ps
