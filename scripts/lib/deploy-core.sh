# =============================================================================
# iVOD — Cœur du déploiement Docker
#
# Rolling update API (zero-downtime), rebuild worker/web, reload Nginx.
# Sourcé par deploy.sh — ne pas exécuter directement.
# =============================================================================

: "${PROJECT_DIR:?PROJECT_DIR doit être défini}"

check_active_transcodes() {
  local count
  count="$(docker exec ivod-postgres-prod psql -U ivod -d ivod -t -A -c \
    "SELECT COUNT(*) FROM video_assets WHERE status IN ('TRANSCODING','PROBING','PACKAGING');" 2>/dev/null || echo "")"

  if [ -z "${count}" ]; then
    warn "Impossible de vérifier les encodages actifs (postgres injoignable) — poursuite du déploiement."
    return 0
  fi
  if [ "${count}" -gt 0 ]; then
    warn "${count} asset(s) en cours d'encodage — redéployer le worker va les interrompre."
    warn "Sans risque de blocage permanent (job échoué proprement + relance auto si besoin),"
    warn "mais le travail de transcodage déjà effectué pour ce cycle sera perdu (repart de PROBE)."
  else
    log "Aucun encodage actif — redéploiement du worker sans impact."
  fi
}

deploy_api_instance() {
  local svc="$1" container="$2"
  local health_tries="${3:-30}" health_interval="${4:-2}"

  log "Redéploiement de ${svc} (${container})..."
  # shellcheck disable=SC2086
  ${COMPOSE} up -d --no-deps --build "${svc}"
  log "Attente de l'état healthy de ${container}..."
  wait_healthy "${container}" "${health_tries}" "${health_interval}" die
  log "${container} healthy — bascule effective."
}

run_prod_deploy() {
  local health_tries="${1:-30}"
  local health_interval="${2:-2}"

  : "${COMPOSE:?COMPOSE doit être défini avant run_prod_deploy}"

  log "Préparation des dossiers (make prod-setup)..."
  make -C "${PROJECT_DIR}" prod-setup

  deploy_api_instance api_1 ivod-api-1-prod "${health_tries}" "${health_interval}"
  deploy_api_instance api_2 ivod-api-2-prod "${health_tries}" "${health_interval}"

  log "Vérification des encodages actifs avant redéploiement du worker..."
  check_active_transcodes

  log "Redéploiement du worker vidéo..."
  # shellcheck disable=SC2086
  ${COMPOSE} up -d --no-deps --build video-worker

  log "Redéploiement du web..."
  # shellcheck disable=SC2086
  ${COMPOSE} up -d --no-deps --build web

  log "Vérification de la config Nginx avant reload..."
  if docker exec ivod-nginx-prod nginx -t; then
    docker exec ivod-nginx-prod nginx -s reload
    log "Nginx rechargé (config valide)."
  else
    warn "config Nginx invalide — reload ignoré, l'ancienne config reste active."
  fi

  # shellcheck disable=SC2086
  ${COMPOSE} ps
}
