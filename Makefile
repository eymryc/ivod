# =============================================================================
# IVOD — Commandes de développement
#
# Docker :  API + worker vidéo + PostgreSQL + Redis + MinIO
# Local  :  Web Next.js  →  cd apps/web && npm run dev
#
# Compose files :
#   apps/api/docker-compose.dev.yml   → dev (api, worker, infra)
#   apps/api/docker-compose.prod.yml  → prod api + infra
#   apps/web/docker-compose.prod.yml  → prod web (rejoint le réseau ivod-prod)
#
# --env-file explicite : avec plusieurs -f, Compose déduit le "répertoire de
# projet" (et donc le .env auto-chargé pour l'interpolation ${VAR}) du DOSSIER
# DU PREMIER FICHIER -f — comportement qui varie selon les versions de Compose
# et facile à casser silencieusement. On fixe donc apps/api/.env explicitement
# comme source unique de vérité pour ${VAR} (y compris les NEXT_PUBLIC_* du
# build web — voir la section "Prod uniquement" de apps/api/.env.example).
# =============================================================================

DEV_COMPOSE       := apps/api/docker-compose.dev.yml
PROD_ENV_FILE     := --env-file apps/api/.env
PROD_COMPOSE      := $(PROD_ENV_FILE) -f apps/api/docker-compose.prod.yml -f apps/web/docker-compose.prod.yml
PROD_S3_COMPOSE   := $(PROD_COMPOSE) -f apps/api/docker-compose.s3-external.yml
MONITORING_COMPOSE := $(PROD_ENV_FILE) -f apps/monitoring/docker-compose.monitoring.yml

.PHONY: help install \
        dev-up dev-down dev-build dev-rebuild dev-logs dev-restart dev-clean \
        api-logs video-worker-logs api-shell \
        db-generate db-migrate db-migrate-new db-seed db-reset db-adminer db-studio \
        prod-setup prod-up prod-down prod-build prod-logs \
        prod-db-migrate prod-db-seed \
        prod-s3-up prod-s3-build \
        monitoring-up monitoring-down monitoring-logs \
        prod-logs-api prod-logs-worker prod-logs-nginx prod-logs-web \
        backup-postgres backup-minio \
        mobile-dev mobile-ios mobile-android \
        lint test clean prune

.DEFAULT_GOAL := help

# ─── Couleurs ────────────────────────────────────────────────────────────────
CYAN  := \033[36m
RESET := \033[0m

# ─── Help ────────────────────────────────────────────────────────────────────
help: ## Affiche cette aide
	@echo ""
	@echo "IVOD — Commandes disponibles"
	@echo "=============================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / \
	  {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

# ─── Installation ────────────────────────────────────────────────────────────
install: ## Installe toutes les dépendances npm (monorepo)
	npm install

# ─── Développement ───────────────────────────────────────────────────────────
dev-up: ## Démarre API + worker vidéo + infra en arrière-plan
	docker compose -f $(DEV_COMPOSE) up -d

dev-build: ## Build l'image API puis démarre tous les services
	docker compose -f $(DEV_COMPOSE) up -d --build

dev-rebuild: ## Force le rebuild complet de l'image API (sans cache)
	docker compose -f $(DEV_COMPOSE) build --no-cache api video-worker
	docker compose -f $(DEV_COMPOSE) up -d

dev-down: ## Arrête tous les services (volumes conservés)
	docker compose -f $(DEV_COMPOSE) down

dev-restart: ## Redémarre tous les services
	docker compose -f $(DEV_COMPOSE) restart

dev-clean: ## ⚠️  Arrête les services ET supprime tous les volumes (perte de données)
	docker compose -f $(DEV_COMPOSE) down -v --remove-orphans

dev-logs: ## Suit les logs de tous les services
	docker compose -f $(DEV_COMPOSE) logs -f

# ─── API ─────────────────────────────────────────────────────────────────────
api-logs: ## Suit les logs de l'API uniquement
	docker compose -f $(DEV_COMPOSE) logs -f api

video-worker-logs: ## Suit les logs du worker transcodage vidéo
	docker compose -f $(DEV_COMPOSE) logs -f video-worker

api-shell: ## Ouvre un shell dans le container API
	docker compose -f $(DEV_COMPOSE) exec -it api sh

# ─── Base de données (Prisma) ────────────────────────────────────────────────
db-generate: ## Régénère le client Prisma + synchronise les types localement pour l'IDE
	docker compose -f $(DEV_COMPOSE) exec \
	  -w /app api \
	  npx prisma generate
	@mkdir -p apps/api/node_modules/@prisma
	@# pnpm crée @prisma/client en symlink → docker cp échoue sans suppression préalable
	@rm -rf apps/api/node_modules/@prisma/client
	@docker compose -f $(DEV_COMPOSE) cp \
	  api:/app/node_modules/@prisma/client \
	  apps/api/node_modules/@prisma/

db-migrate: ## Applique les migrations existantes (prisma migrate deploy)
	docker compose -f $(DEV_COMPOSE) exec -it \
	  -w /app api \
	  npx prisma migrate deploy

db-migrate-new: ## Crée + applique une nouvelle migration (prisma migrate dev)
	docker compose -f $(DEV_COMPOSE) exec -it \
	  -w /app api \
	  npx prisma migrate dev

db-seed: db-generate ## Exécute le seed Prisma
	docker compose -f $(DEV_COMPOSE) exec -it \
	  -w /app api \
	  npx ts-node --project tsconfig.json prisma/seed.ts

db-reset: ## ⚠️  Remet la BDD à zéro et re-seed (migrate reset --force)
	docker compose -f $(DEV_COMPOSE) exec -it \
	  -w /app api \
	  npx prisma migrate reset --force

db-adminer: ## Ouvre Adminer dans le navigateur (port 8080)
	@echo "Adminer → http://localhost:8080"
	@echo "  Système : PostgreSQL"
	@echo "  Serveur : postgres"
	@echo "  Utilisateur : $${POSTGRES_USER:-ivod}"
	@echo "  Mot de passe : $${POSTGRES_PASSWORD:-ivod}"
	@echo "  Base : $${POSTGRES_DB:-ivod}"
	@open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || true

db-studio: ## Ouvre Prisma Studio (UI base de données) sur le port 5555
	docker compose -f $(DEV_COMPOSE) exec -it \
	  -w /app api \
	  npx prisma studio --port 5555 --browser none
	@echo "Prisma Studio disponible sur http://localhost:5555"

# ─── Production ──────────────────────────────────────────────────────────────
prod-setup: ## Prépare les dossiers de logs + webroot ACME + réseau Docker (à exécuter une fois avant prod-up)
	@echo "Création des dossiers de logs..."
	@mkdir -p apps/api/logs/api/1 apps/api/logs/api/2 apps/api/logs/worker apps/api/logs/nginx
	@# api_1/api_2 partagent la même image — répertoires de logs séparés pour ne pas interleaver les fichiers Winston
	@mkdir -p apps/api/certbot-webroot
	@# API et worker tournent en UID 1001 (nestjs) — le dossier doit lui être accessible
	@chmod 777 apps/api/logs/api/1 apps/api/logs/api/2 apps/api/logs/worker
	@# Nginx tourne en root dans le container Alpine
	@chmod 755 apps/api/logs/nginx
	@# Réseau externe partagé par apps/api/*.yml et apps/web/*.yml (external: true
	@# des deux côtés — évite l'ambiguïté de fusion si Compose devait le créer lui-même)
	@docker network inspect ivod-prod >/dev/null 2>&1 || docker network create ivod-prod
	@echo "OK → apps/api/logs/{api/1,api/2,worker,nginx} + apps/api/certbot-webroot + réseau ivod-prod"

prod-up: prod-setup ## Démarre l'environnement de production (MinIO self-hosted)
	docker compose $(PROD_COMPOSE) up -d

prod-build: prod-setup ## Build et démarre la production (MinIO self-hosted)
	docker compose $(PROD_COMPOSE) up -d --build

prod-s3-up: prod-setup ## Démarre la production avec S3 externe (Wasabi/Backblaze)
	docker compose $(PROD_S3_COMPOSE) up -d

prod-s3-build: prod-setup ## Build et démarre la production avec S3 externe
	docker compose $(PROD_S3_COMPOSE) up -d --build

prod-down: ## Arrête la production
	docker compose $(PROD_COMPOSE) down

monitoring-up: ## Démarre le stack monitoring (Uptime Kuma + Loki + Grafana)
	docker compose $(MONITORING_COMPOSE) up -d

monitoring-down: ## Arrête le stack monitoring
	docker compose $(MONITORING_COMPOSE) down

monitoring-logs: ## Suit les logs du monitoring
	docker compose $(MONITORING_COMPOSE) logs -f

prod-logs: ## Suit les logs de tous les services de production
	docker compose $(PROD_COMPOSE) logs -f

prod-logs-api: ## Suit les logs des 2 réplicas API (stdout + fichiers Winston dans logs/api/{1,2}/)
	docker compose $(PROD_COMPOSE) logs -f api_1 api_2

prod-logs-worker: ## Suit les logs du worker vidéo
	docker compose $(PROD_COMPOSE) logs -f video-worker

prod-logs-web: ## Suit les logs du frontend Next.js (stdout uniquement)
	docker compose $(PROD_COMPOSE) logs -f web

prod-logs-nginx: ## Affiche les dernières lignes des logs Nginx (fichiers disque)
	@echo "=== access.log ===" && tail -50 apps/api/logs/nginx/access.log 2>/dev/null || echo "(vide)"
	@echo "=== error.log ===" && tail -50 apps/api/logs/nginx/error.log 2>/dev/null || echo "(vide)"

prod-db-migrate: ## Applique les migrations Prisma sur la prod (déjà fait au démarrage API)
	docker exec ivod-api-1-prod node_modules/.bin/prisma migrate deploy

prod-db-seed: ## Exécute le seed Prisma sur la prod (voir scripts/prod-seed.sh)
	./scripts/prod-seed.sh

# ─── Sauvegardes ─────────────────────────────────────────────────────────────
backup-postgres: ## Dump Postgres immédiat (gzip + rotation) — voir docs/DEPLOY.md section 6
	./scripts/backup-postgres.sh

backup-minio: ## Miroir MinIO immédiat (ivod-assets + ivod-videos) — voir docs/DEPLOY.md section 6
	./scripts/backup-minio.sh

# ─── Mobile (hors Docker) ────────────────────────────────────────────────────
mobile-dev: ## Démarre Expo (Mobile)
	npm run dev --workspace @ivod/mobile

mobile-ios: ## Lance l'app sur le simulateur iOS
	npm run ios --workspace @ivod/mobile

mobile-android: ## Lance l'app sur l'émulateur Android
	npm run android --workspace @ivod/mobile

# ─── Utilitaires ─────────────────────────────────────────────────────────────
lint: ## Lint tous les packages
	npm run lint

test: ## Exécute les tests
	npm run test

clean: ## Nettoie node_modules et dossiers de build
	npm run clean

prune: ## Supprime les images et containers Docker inutilisés
	docker system prune -f
