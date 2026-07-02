#!/usr/bin/env bash
# =============================================================================
# IVOD — Sauvegarde PostgreSQL (production)
#
# pg_dump via `docker exec` (pas besoin d'exposer le port Postgres), gzip,
# rotation (supprime les dumps plus vieux que BACKUP_RETENTION_DAYS).
#
# Usage : ./scripts/backup-postgres.sh
# Installation planifiée : voir docs/DEPLOY.md section 6 (timer systemd).
#
# Variables (lues depuis apps/api/.env si présentes, sinon valeurs par défaut) :
#   BACKUP_DIR              défaut : <repo>/apps/api/backups/postgres
#   BACKUP_RETENTION_DAYS   défaut : 14
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_TAG="backup-postgres"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

load_env

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/apps/api/backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
CONTAINER="ivod-postgres-prod"
POSTGRES_USER="${POSTGRES_USER:?POSTGRES_USER manquant dans apps/api/.env}"
POSTGRES_DB="${POSTGRES_DB:-ivod}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEST="${BACKUP_DIR}/ivod_${TIMESTAMP}.sql.gz"

log "Dump de ${POSTGRES_DB} (${CONTAINER}) → ${DEST}"
docker exec "${CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DEST}"

# Vérifie que le dump n'est pas vide/corrompu avant de faire confiance à la rotation
if ! gzip -t "${DEST}" 2>/dev/null; then
  rm -f "${DEST}"
  die "${DEST} n'est pas un gzip valide — dump probablement échoué."
fi

SIZE="$(du -h "${DEST}" | cut -f1)"
log "OK (${SIZE})"

log "Rotation : suppression des dumps > ${BACKUP_RETENTION_DAYS} jours..."
find "${BACKUP_DIR}" -name 'ivod_*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete

log "Terminé. Dumps conservés :"
ls -lh "${BACKUP_DIR}"
