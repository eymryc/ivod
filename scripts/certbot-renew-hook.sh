#!/usr/bin/env bash
# =============================================================================
# IVOD — Hook de déploiement certbot (renouvellement Let's Encrypt)
#
# Nginx est dockerisé et lit ses certs depuis apps/api/nginx/ssl/, PAS
# directement /etc/letsencrypt/ — ce hook copie les certs renouvelés au bon
# endroit puis recharge le conteneur (sans coupure).
#
# Installation sur le serveur (une seule fois, voir docs/DEPLOY.md section 1.3) :
#   ln -s /var/www/ivod/scripts/certbot-renew-hook.sh \
#     /etc/letsencrypt/renewal-hooks/deploy/ivod-nginx.sh
#
# Tout script dans renewal-hooks/deploy/ est exécuté AUTOMATIQUEMENT par
# `certbot renew` après un renouvellement réussi — pas besoin de --deploy-hook.
# =============================================================================

set -euo pipefail

DOMAIN="ivod-preprod-srv01.xselcloud.com"
PROJECT_DIR="/var/www/ivod"
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
SSL_DIR="${PROJECT_DIR}/apps/api/nginx/ssl"

cp "${LIVE_DIR}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
cp "${LIVE_DIR}/privkey.pem"   "${SSL_DIR}/privkey.pem"

docker exec ivod-nginx-prod nginx -t
docker exec ivod-nginx-prod nginx -s reload

echo "[certbot-renew-hook] certs mis à jour + Nginx rechargé pour ${DOMAIN}."
