#!/usr/bin/env bash
# =============================================================================
# IVOD — Bootstrap serveur production (AlmaLinux 10) — PREMIÈRE mise en route
#
# Différent de deploy.sh : deploy.sh fait des redéploiements zero-downtime sur
# une stack DÉJÀ en place. Ce script-ci prépare le serveur de zéro (paquets,
# firewall, certificat, premier démarrage, timers) — à lancer UNE SEULE FOIS.
#
# Prérequis avant de lancer ce script :
#   1. Le code est déjà sur le serveur, dans le même dossier que ce script
#      (ex: rsync/git clone vers /var/www/ivod)
#   2. apps/api/.env existe et est rempli (copié depuis apps/api/.env.production,
#      avec SMTP/Paystack remplis — Sentry optionnel)
#   3. Le DNS de votre domaine pointe déjà vers ce serveur
#
# Usage : sudo ./scripts/bootstrap-server.sh
#
# Idempotent : peut être relancé sans casser un état déjà en place — chaque
# étape vérifie si elle a déjà été faite avant d'agir (utile si une étape a
# échoué au milieu et qu'on relance après correction).
# =============================================================================

set -euo pipefail

DOMAIN="ivod-preprod-srv01.xselcloud.com"
CERTBOT_EMAIL="training@xsel-services.com"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

SCRIPT_TAG="bootstrap"
# shellcheck source=scripts/lib/common.sh
source "${PROJECT_DIR}/scripts/lib/common.sh"

# ── 1. Vérifications préalables ─────────────────────────────────────────────
log "1/10 — Vérifications préalables"

[ "$(id -u)" -eq 0 ] || die "ce script doit être lancé en root (sudo ./scripts/bootstrap-server.sh)"
command -v dnf >/dev/null 2>&1 || die "dnf introuvable — ce script cible AlmaLinux/RHEL"
[ -f "${PROJECT_DIR}/apps/api/.env" ] || die "apps/api/.env manquant — copiez apps/api/.env.production vers apps/api/.env et remplissez SMTP/Paystack avant de continuer"

log "OK : root, dnf disponible, apps/api/.env présent"

# ── 2. Paquets système ───────────────────────────────────────────────────────
log "2/10 — Paquets système (Docker, certbot)"

if ! command -v docker >/dev/null 2>&1; then
  log "Docker absent, installation..."
  dnf install -y dnf-plugins-core
  dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
  dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
else
  log "Docker déjà installé, skip"
fi

if ! command -v certbot >/dev/null 2>&1; then
  log "Certbot absent, installation (EPEL)..."
  dnf install -y epel-release
  dnf install -y certbot
else
  log "Certbot déjà installé, skip"
fi

command -v dig >/dev/null 2>&1 || dnf install -y bind-utils
command -v make >/dev/null 2>&1 || dnf install -y make

# ── 3. Firewalld ─────────────────────────────────────────────────────────────
log "3/10 — Firewalld (ssh, http, https uniquement — 3000/3001 jamais publiés par Docker de toute façon)"

if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=ssh >/dev/null
  firewall-cmd --permanent --add-service=http >/dev/null
  firewall-cmd --permanent --add-service=https >/dev/null
  firewall-cmd --permanent --remove-port=3000/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --remove-port=3001/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null
  log "Firewalld configuré : $(firewall-cmd --list-services)"
else
  warn "firewalld n'est pas actif sur ce serveur — vérifiez votre pare-feu manuellement"
fi

# ── 4. Vérification DNS ──────────────────────────────────────────────────────
log "4/10 — Vérification DNS de ${DOMAIN}"

SERVER_IP="$(curl -s -4 --max-time 5 https://ifconfig.me || true)"
DOMAIN_IP="$(dig +short "${DOMAIN}" @1.1.1.1 2>/dev/null | tail -1 || true)"

if [ -z "${DOMAIN_IP}" ]; then
  warn "${DOMAIN} ne résout à aucune IP — le challenge Let's Encrypt (étape 5) va échouer tant que le DNS n'est pas configuré."
elif [ -n "${SERVER_IP}" ] && [ "${DOMAIN_IP}" != "${SERVER_IP}" ]; then
  warn "${DOMAIN} résout vers ${DOMAIN_IP}, mais ce serveur semble être ${SERVER_IP} — vérifiez le DNS."
else
  log "DNS OK : ${DOMAIN} → ${DOMAIN_IP}"
fi

# ── 5. Certificat Let's Encrypt (skip si déjà présent) ──────────────────────
if [ -f "${PROJECT_DIR}/apps/api/nginx/ssl/fullchain.pem" ]; then
  log "5/10 — Certificat déjà présent dans apps/api/nginx/ssl/, skip"
else
  log "5/10 — Génération du certificat Let's Encrypt (webroot bootstrap)"
  mkdir -p "${PROJECT_DIR}/apps/api/certbot-webroot"

  # Nginx temporaire juste pour répondre au challenge HTTP-01 (le vrai Nginx,
  # dockerisé, n'est pas encore démarré et ne peut pas l'être sans certs).
  docker run --rm -d --name certbot-bootstrap -p 80:80 \
    -v "${PROJECT_DIR}/apps/api/certbot-webroot:/usr/share/nginx/html:ro" \
    nginx:1.28-alpine

  if certbot certonly --webroot -w "${PROJECT_DIR}/apps/api/certbot-webroot" \
      -d "${DOMAIN}" \
      --email "${CERTBOT_EMAIL}" --agree-tos --non-interactive; then
    cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${PROJECT_DIR}/apps/api/nginx/ssl/"
    cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"   "${PROJECT_DIR}/apps/api/nginx/ssl/"
    log "Certificat obtenu et copié dans apps/api/nginx/ssl/"
  else
    docker stop certbot-bootstrap >/dev/null 2>&1 || true
    die "échec de l'obtention du certificat — vérifiez le DNS (étape 4) puis relancez ce script"
  fi

  docker stop certbot-bootstrap >/dev/null 2>&1 || true
fi

# ── 6. Premier démarrage ─────────────────────────────────────────────────────
log "6/10 — Démarrage de la stack (make prod-build)"
make -C "${PROJECT_DIR}" prod-build

# ── 7. Attente des health checks ─────────────────────────────────────────────
log "7/10 — Attente que tous les services soient healthy (jusqu'à 5 min)"

CONTAINERS="ivod-postgres-prod ivod-redis-prod ivod-minio-prod ivod-api-1-prod ivod-api-2-prod ivod-web-prod ivod-nginx-prod"

for container in ${CONTAINERS}; do
  # "warn" (pas "die") sur timeout : au premier bootstrap on préfère voir
  # l'état de TOUS les conteneurs avant de s'arrêter, plutôt qu'échouer sec
  # au premier qui traîne (contrairement à deploy.sh, en rolling update).
  wait_healthy "${container}" 60 5 warn || true
  log "${container} : $(docker inspect -f '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo inconnu)"
done

# ── 8. Renouvellement certbot automatique ────────────────────────────────────
log "8/10 — Hook de renouvellement certbot"

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
if [ ! -e /etc/letsencrypt/renewal-hooks/deploy/ivod-nginx.sh ]; then
  ln -s "${PROJECT_DIR}/scripts/certbot-renew-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/ivod-nginx.sh
  log "Hook installé (symlink)"
else
  log "Hook déjà installé, skip"
fi
systemctl enable --now certbot-renew.timer 2>/dev/null || warn "certbot-renew.timer introuvable — le paquet certbot ne l'a peut-être pas créé sur cette version"

# ── 9. Timers de sauvegarde ───────────────────────────────────────────────────
log "9/10 — Timers de sauvegarde (Postgres quotidien + MinIO 4x/jour)"

install_timer() {
  local name="$1" description="$2" script="$3" oncalendar="$4"
  cat > "/etc/systemd/system/${name}.service" <<EOF
[Unit]
Description=${description}
[Service]
Type=oneshot
WorkingDirectory=${PROJECT_DIR}
ExecStart=${PROJECT_DIR}/scripts/${script}
EOF
  cat > "/etc/systemd/system/${name}.timer" <<EOF
[Unit]
Description=${description} (timer)
[Timer]
OnCalendar=${oncalendar}
Persistent=true
[Install]
WantedBy=timers.target
EOF
}

install_timer "ivod-backup-postgres" "IVOD - Sauvegarde PostgreSQL" "backup-postgres.sh" "daily"
install_timer "ivod-backup-minio"    "IVOD - Miroir MinIO"          "backup-minio.sh"    "*-*-* 00,06,12,18:00:00"

systemctl daemon-reload
systemctl enable --now ivod-backup-postgres.timer ivod-backup-minio.timer
log "Timers installés et activés"

# ── 10. Seed initial (base vide uniquement) ───────────────────────────────────
log "10/11 — Seed initial (si la base est vide)"

load_env

USER_COUNT="$(docker exec ivod-postgres-prod psql -U "${POSTGRES_USER:-ivod}" -d "${POSTGRES_DB:-ivod}" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "")"
if [ "${USER_COUNT}" = "0" ]; then
  log "Aucun utilisateur — exécution du seed (make prod-db-seed)..."
  make -C "${PROJECT_DIR}" prod-db-seed
elif [ -n "${USER_COUNT}" ]; then
  log "Base déjà peuplée (${USER_COUNT} utilisateur(s)) — seed ignoré"
else
  warn "Impossible de lire le nombre d'utilisateurs — seed ignoré (lancez manuellement : make prod-db-seed)"
fi

# ── 11. Smoke test ────────────────────────────────────────────────────────────
log "11/11 — Smoke test HTTP"

sleep 5
API_HEALTH="$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN}/api/v1/health" || echo "000")"
WEB_STATUS="$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN}/" || echo "000")"

if [ "${API_HEALTH}" = "200" ]; then log "API health : 200 OK"; else warn "API health a répondu ${API_HEALTH} (attendu 200) — voir 'docker logs ivod-api-1-prod'"; fi
if [ "${WEB_STATUS}" = "200" ]; then log "Web : 200 OK"; else warn "Web a répondu ${WEB_STATUS} (attendu 200) — voir 'docker logs ivod-web-prod'"; fi

log "Bootstrap terminé."
cat <<'EOF'

Reste à faire manuellement (pas automatisable depuis ce script) :
  - SENTRY_DSN dans apps/api/.env (optionnel — monitoring d'erreurs)
  - Repasser ALLOW_PAYMENT_SIMULATION=false une fois les clés Paystack réelles validées
  - make monitoring-up (Uptime Kuma + Grafana, optionnel — accès via tunnel SSH)
  - Smoke test FONCTIONNEL manuel : inscription (email OTP), upload image + vidéo,
    notification temps réel entre 2 onglets/navigateurs différents

Commandes prod utiles (sur le serveur, depuis /var/www/ivod) :
  make prod-db-migrate   # migrations (normalement auto au démarrage API)
  make prod-db-seed      # seed manuel (références + comptes démo)
  ./deploy.sh main       # déploiements suivants (git fetch + rolling update)
EOF
