#!/usr/bin/env bash
# =============================================================================
# IVOD — Réparation du dépôt git sur le serveur
#
# Corrige le cas fréquent : .git existe (git init partiel) mais sans remote
# origin ni commit — ./deploy.sh échoue alors avec "origin does not appear
# to be a git repository".
#
# Usage (sur le serveur) :
#   GIT_REMOTE_URL=https://github.com/eymryc/ivod.git ./scripts/repair-server-git.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-https://github.com/eymryc/ivod.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

SCRIPT_TAG="repair-git"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/sync-git.sh
source "${PROJECT_DIR}/scripts/lib/sync-git.sh"

git config --global --add safe.directory "${PROJECT_DIR}" 2>/dev/null || true

repair_git_repo "${PROJECT_DIR}" "${GIT_REMOTE_URL}" "${GIT_BRANCH}"
sync_from_git "${GIT_BRANCH}"

log "Dépôt git réparé — vous pouvez lancer ./deploy.sh main"
