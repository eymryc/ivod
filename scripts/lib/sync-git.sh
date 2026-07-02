# =============================================================================
# IVOD — Synchronisation du code via git (serveur)
# =============================================================================

# Réinitialise un dépôt git invalide (pas de remote, pas de commit HEAD).
repair_git_repo() {
  local remote_dir="$1"
  local remote_url="$2"
  local branch="$3"

  cd "${remote_dir}"

  if [ -d .git ] && ! git remote get-url origin >/dev/null 2>&1; then
    warn "dépôt git sans remote origin — réinitialisation"
    rm -rf .git
  fi

  if [ -d .git ] && ! git rev-parse HEAD >/dev/null 2>&1; then
    warn "dépôt git sans commit — réinitialisation"
    rm -rf .git
  fi

  if [ ! -d .git ]; then
    log "Initialisation git (remote: ${remote_url}, branche: ${branch})"
    git init -q
    git remote add origin "${remote_url}"
    git fetch origin "${branch}"
    git checkout -f -B "${branch}" "origin/${branch}"
    return 0
  fi

  # Remote présent mais URL différente → mise à jour
  local current_url
  current_url="$(git remote get-url origin 2>/dev/null || true)"
  if [ "${current_url}" != "${remote_url}" ]; then
    log "Mise à jour du remote origin (${current_url} → ${remote_url})"
    git remote set-url origin "${remote_url}"
  fi
}

sync_from_git() {
  local branch="$1"

  : "${GIT_REMOTE_URL:?GIT_REMOTE_URL doit être défini (ex: https://github.com/org/ivod.git)}"

  repair_git_repo "${PROJECT_DIR}" "${GIT_REMOTE_URL}" "${branch}"

  cd "${PROJECT_DIR}"

  if ! git diff --quiet HEAD 2>/dev/null; then
    die "modifications locales non commitées sur le serveur — annulation (git status)."
  fi

  log "git fetch origin..."
  git fetch origin

  git checkout "${branch}"
  if git show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
    git reset --hard "origin/${branch}"
  else
    git reset --hard "${branch}"
  fi

  log "Code synchronisé sur $(git rev-parse --short HEAD 2>/dev/null || echo 'inconnu')."
}
