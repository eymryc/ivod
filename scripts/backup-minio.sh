#!/usr/bin/env bash
# =============================================================================
# IVOD — Sauvegarde MinIO (production, mode self-hosted uniquement)
#
# `mc mirror` (client MinIO officiel, exécuté comme conteneur éphémère —
# rien à installer sur l'hôte) synchronise les buckets ivod-assets/ivod-videos
# vers un répertoire local. Contrairement à Postgres, pas de dump horodaté :
# les vidéos/images publiées ne changent quasi jamais, un miroir incrémental
# suffit et coûte beaucoup moins cher en espace disque que des copies
# complètes répétées.
#
# ⚠️  LIMITE : ce script protège contre une suppression accidentelle ou une
# corruption du bucket MinIO, PAS contre une panne disque totale du VPS tant
# que BACKUP_DIR reste sur le même disque physique. Pour une vraie durabilité,
# synchroniser BACKUP_DIR vers un autre hôte/stockage (rsync, rclone) ou
# pointer directement BACKUP_DIR sur un point de montage réseau séparé.
#
# N/A en mode S3 externe (docker-compose.s3-external.yml, Wasabi/Backblaze) —
# la durabilité est alors gérée par le fournisseur S3 lui-même.
#
# Usage : ./scripts/backup-minio.sh
# Installation planifiée : voir docs/DEPLOY.md section 6 (timer systemd).
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_TAG="backup-minio"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

load_env

BACKUP_DIR="${MINIO_BACKUP_DIR:-${PROJECT_DIR}/apps/api/backups/minio}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER manquant dans apps/api/.env}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD manquant dans apps/api/.env}"
BUCKET_ASSETS="${MINIO_BUCKET_ASSETS:-ivod-assets}"
BUCKET_VIDEOS="${MINIO_BUCKET_VIDEOS:-ivod-videos}"

mkdir -p "${BACKUP_DIR}/${BUCKET_ASSETS}" "${BACKUP_DIR}/${BUCKET_VIDEOS}"

log "Miroir de ${BUCKET_ASSETS} et ${BUCKET_VIDEOS} → ${BACKUP_DIR}"

docker run --rm \
  --network ivod-prod \
  -v "${BACKUP_DIR}:/backup" \
  --entrypoint sh \
  minio/mc:RELEASE.2025-08-13T08-35-41Z \
  -c "
    set -e
    mc alias set src http://minio:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' >/dev/null
    mc mirror --quiet --overwrite src/${BUCKET_ASSETS} /backup/${BUCKET_ASSETS}
    mc mirror --quiet --overwrite src/${BUCKET_VIDEOS} /backup/${BUCKET_VIDEOS}
  "

log "Terminé. Taille du miroir :"
du -sh "${BACKUP_DIR}/${BUCKET_ASSETS}" "${BACKUP_DIR}/${BUCKET_VIDEOS}"
