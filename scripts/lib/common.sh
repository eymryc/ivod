# =============================================================================
# IVOD — Bibliothèque partagée des scripts de déploiement
#
# Ne s'exécute PAS directement — sourcé par deploy.sh, bootstrap-server.sh,
# remote-bootstrap.sh, backup-postgres.sh, backup-minio.sh. Centralise ce qui
# était dupliqué à l'identique (ou presque) dans chacun : logging coloré,
# chargement de apps/api/.env, construction de la commande docker compose,
# et l'attente qu'un conteneur devienne "healthy".
#
# Contrat avec le script appelant :
#   - PROJECT_DIR doit être défini AVANT de sourcer ce fichier (chaque script
#     le calcule différemment selon qu'il vit à la racine du repo ou dans
#     scripts/ — ce fichier ne le devine pas à sa place).
#   - SCRIPT_TAG (optionnel) préfixe les logs, ex: SCRIPT_TAG="deploy".
# =============================================================================

: "${PROJECT_DIR:?PROJECT_DIR doit être défini avant de sourcer common.sh}"
SCRIPT_TAG="${SCRIPT_TAG:-ivod}"

log()  { printf '\n\033[1;36m[%s]\033[0m %s\n' "${SCRIPT_TAG}" "$*"; }
warn() { printf '\033[1;33m[%s] ATTENTION :\033[0m %s\n' "${SCRIPT_TAG}" "$*" >&2; }
die()  { printf '\033[1;31m[%s] ERREUR :\033[0m %s\n' "${SCRIPT_TAG}" "$*" >&2; exit 1; }

# Charge apps/api/.env dans l'environnement courant du script (no-op silencieux
# si absent — chaque appelant décide si c'est bloquant via ses propres checks).
load_env() {
  local env_file="${PROJECT_DIR}/apps/api/.env"
  if [ -f "${env_file}" ]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
}

# Commande docker compose canonique — DOIT rester le miroir exact de
# PROD_COMPOSE dans le Makefile racine (même --env-file, mêmes -f). Si vous
# ajoutez un compose file à l'un, ajoutez-le à l'autre.
# Usage : $(compose_cmd) up -d ...   ou   $(compose_cmd "-f apps/api/docker-compose.s3-external.yml") up -d ...
compose_cmd() {
  local extra="${1:-}"
  printf 'docker compose --env-file %s/apps/api/.env -f %s/apps/api/docker-compose.prod.yml -f %s/apps/web/docker-compose.prod.yml %s' \
    "${PROJECT_DIR}" "${PROJECT_DIR}" "${PROJECT_DIR}" "${extra}"
}

# Attend qu'un conteneur passe "healthy". Sur timeout : die() (bloquant, pour
# un rolling update en cours) ou warn() (continue, pour un premier bootstrap
# où on préfère lister l'état de tout avant de s'arrêter).
#   wait_healthy <container> <max_tries> <poll_interval_sec> <fatal|warn>
wait_healthy() {
  local container="$1" max_tries="$2" interval="$3" on_timeout="${4:-die}"
  local tries=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "")" = "healthy" ]; do
    tries=$((tries + 1))
    if [ "${tries}" -ge "${max_tries}" ]; then
      if [ "${on_timeout}" = "die" ]; then
        die "${container} n'est jamais devenu \"healthy\" (${max_tries} tentatives)."
      else
        warn "${container} n'est jamais devenu \"healthy\" après ${max_tries} tentatives — voir 'docker logs ${container}'"
        return 1
      fi
    fi
    sleep "${interval}"
  done
  return 0
}
