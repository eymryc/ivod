#!/usr/bin/env bash
# =============================================================================
# IVOD — Transfert rsync vers le serveur de production
#
# Utilisé par :
#   - GitHub Actions (job deploy dans deploy.yml)
#   - make remote-deploy (fallback local si Actions indisponible)
#
# Variables requises :
#   PROD_HOST, PROD_USER, PROD_APP_DIR
# Variables optionnelles :
#   PROD_PORT (défaut 22)
#   SSH_KEY_FILE (défaut ~/.ssh/deploy_key — créé par la CI ou absent = clé agent)
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_PORT="${PROD_PORT:-22}"
SSH_KEY_FILE="${SSH_KEY_FILE:-${HOME}/.ssh/deploy_key}"
EXCLUDES_FILE="${PROJECT_DIR}/scripts/lib/rsync-excludes.txt"

: "${PROD_HOST:?PROD_HOST requis}"
: "${PROD_USER:?PROD_USER requis}"
: "${PROD_APP_DIR:?PROD_APP_DIR requis}"
[ -f "${EXCLUDES_FILE}" ] || { echo "ERREUR: ${EXCLUDES_FILE} introuvable" >&2; exit 1; }

SSH_OPTS=(-p "${PROD_PORT}" -o StrictHostKeyChecking=accept-new)
[ -f "${SSH_KEY_FILE}" ] && SSH_OPTS=(-i "${SSH_KEY_FILE}" "${SSH_OPTS[@]}")

EXCLUDES=()
while IFS= read -r line || [ -n "${line}" ]; do
  line="${line%%#*}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [ -n "${line}" ] || continue
  EXCLUDES+=(--exclude "${line}")
done < "${EXCLUDES_FILE}"

rsync -avz "${EXCLUDES[@]}" \
  -e "ssh ${SSH_OPTS[*]}" \
  "${PROJECT_DIR}/" "${PROD_USER}@${PROD_HOST}:${PROD_APP_DIR}/"
