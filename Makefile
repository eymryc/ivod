# ═══════════════════════════════════════════════════════════════════════════════
# iVOD — Makefile
# ═══════════════════════════════════════════════════════════════════════════════
# make dev          → Tout démarrer en développement (hot reload)
# make staging      → Stack staging (images buildées)
# make prod         → Stack production
# make infra        → Infrastructure seule (postgres, redis, minio)
# make down         → Tout arrêter
# make help         → Afficher toutes les commandes
# ───────────────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

# ── Commandes Docker Compose par environnement ─────────────────────────────
DC_INFRA    := docker compose -f docker-compose.yml
DC_DEV      := docker compose -f docker-compose.yml -f docker-compose.dev.yml
DC_STAGING  := docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging
DC_PROD     := docker compose -f docker-compose.prod.yml --env-file .env.prod

# ── Couleurs terminal ───────────────────────────────────────────────────────
CYAN   := \033[36m
YELLOW := \033[33m
GREEN  := \033[32m
RESET  := \033[0m

.PHONY: help dev dev-build dev-api dev-infra infra staging prod \
        down down-staging down-prod down-v \
        logs logs-api logs-web ps \
        migrate seed studio \
        shell-api shell-web shell-db \
        build-api build-web \
        clean clean-all check-env

# ───────────────────────────────────────────────────────────────────────────────
# AIDE
# ───────────────────────────────────────────────────────────────────────────────

help: ## Affiche cette aide
	@printf "\n$(CYAN)iVOD — Commandes disponibles$(RESET)\n\n"
	@awk 'BEGIN {FS = ":.*##"} \
		/^##@/ { printf "\n$(YELLOW)%s$(RESET)\n", substr($$0,5) } \
		/^[a-zA-Z_-]+:.*##/ { printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@printf "\n"

# ───────────────────────────────────────────────────────────────────────────────
##@ Développement
# ───────────────────────────────────────────────────────────────────────────────

dev: check-env-dev ## Démarrer tout en développement (API + Web + Infra, hot reload)
	$(DC_DEV) up

dev-build: check-env-dev ## Rebuilder les images et démarrer en développement
	$(DC_DEV) up --build

dev-api: check-env-dev ## Démarrer infra + API seulement (sans Web)
	$(DC_DEV) up postgres redis minio minio_init api

dev-web: check-env-dev ## Démarrer infra + Web seulement (API doit tourner sur :3000)
	$(DC_DEV) up postgres redis minio minio_init web

dev-d: check-env-dev ## Démarrer en développement en arrière-plan (detached)
	$(DC_DEV) up -d

# ───────────────────────────────────────────────────────────────────────────────
##@ Infrastructure
# ───────────────────────────────────────────────────────────────────────────────

infra: check-env-infra ## Démarrer l'infrastructure seule (postgres, redis, minio)
	$(DC_INFRA) up -d
	@printf "\n$(GREEN)✓ Infrastructure démarrée$(RESET)\n"
	@printf "  PostgreSQL : localhost:$${POSTGRES_PORT:-5432}\n"
	@printf "  Redis      : localhost:$${REDIS_PORT:-6379}\n"
	@printf "  MinIO API  : http://localhost:$${MINIO_PORT:-9000}\n"
	@printf "  MinIO UI   : http://localhost:$${MINIO_CONSOLE_PORT:-9001}\n"
	@printf "  Adminer    : http://localhost:$${ADMINER_PORT:-8080}  (via make dev)\n\n"

# ───────────────────────────────────────────────────────────────────────────────
##@ Staging & Production
# ───────────────────────────────────────────────────────────────────────────────

staging: check-env-staging ## Démarrer le stack staging (images buildées, env staging)
	$(DC_STAGING) up --build -d
	@printf "\n$(GREEN)✓ Stack staging démarré$(RESET)\n"

staging-logs: ## Suivre les logs staging
	$(DC_STAGING) logs -f

down-staging: ## Arrêter le stack staging
	$(DC_STAGING) down

prod: check-env-prod ## Démarrer le stack de production
	$(DC_PROD) up -d
	@printf "\n$(GREEN)✓ Stack production démarré$(RESET)\n"

prod-logs: ## Suivre les logs production
	$(DC_PROD) logs -f

down-prod: ## Arrêter le stack production
	$(DC_PROD) down

# ───────────────────────────────────────────────────────────────────────────────
##@ Gestion des services
# ───────────────────────────────────────────────────────────────────────────────

down: ## Arrêter les services dev (conserve les volumes)
	$(DC_DEV) down

down-v: ## Arrêter et supprimer les volumes dev (DESTRUCTIF — perte des données)
	@printf "$(YELLOW)⚠ Suppression des volumes dev (données perdues). Continuer ? [y/N] $(RESET)" && read ans && [ $${ans:-N} = y ]
	$(DC_DEV) down -v

ps: ## Lister les services actifs (dev)
	$(DC_DEV) ps

logs: ## Suivre les logs de tous les services dev
	$(DC_DEV) logs -f

logs-api: ## Suivre les logs de l'API
	$(DC_DEV) logs -f api

logs-web: ## Suivre les logs du Web
	$(DC_DEV) logs -f web

logs-db: ## Suivre les logs PostgreSQL
	$(DC_INFRA) logs -f postgres

# ───────────────────────────────────────────────────────────────────────────────
##@ Base de données (dev)
# ───────────────────────────────────────────────────────────────────────────────

migrate: ## Appliquer les migrations Prisma (dev)
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npx prisma migrate dev"

migrate-create: ## Créer une nouvelle migration (usage: make migrate-create NAME=nom)
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npx prisma migrate dev --name $(NAME)"

migrate-deploy: ## Appliquer les migrations sans créer (mode deploy)
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npx prisma migrate deploy"

seed: ## Exécuter tous les seeds (catégories, RBAC, droits…)
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npm run prisma:seed:all"

studio: ## Ouvrir Prisma Studio sur http://localhost:5555
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npx prisma studio --hostname 0.0.0.0 --port 5555"

prisma-generate: ## Régénérer le client Prisma
	$(DC_DEV) exec api sh -c "cd /app/apps/api && npx prisma generate"

# ───────────────────────────────────────────────────────────────────────────────
##@ Shells
# ───────────────────────────────────────────────────────────────────────────────

shell-api: ## Ouvrir un shell dans le conteneur API
	$(DC_DEV) exec api sh

shell-web: ## Ouvrir un shell dans le conteneur Web
	$(DC_DEV) exec web sh

shell-db: ## Ouvrir psql dans PostgreSQL
	$(DC_INFRA) exec postgres psql -U $${POSTGRES_USER:-ivod} -d $${POSTGRES_DB:-ivod}

shell-redis: ## Ouvrir redis-cli
	$(DC_INFRA) exec redis redis-cli

# ───────────────────────────────────────────────────────────────────────────────
##@ Build (images Docker)
# ───────────────────────────────────────────────────────────────────────────────

build-api: ## Builder uniquement l'image API (runner)
	docker build -f apps/api/Dockerfile --target runner -t ivod/api:local .

build-web: ## Builder uniquement l'image Web (runner)
	docker build -f apps/web/Dockerfile --target runner \
		--build-arg NEXT_PUBLIC_API_URL=$${NEXT_PUBLIC_API_URL:-http://localhost:3000/api/v1} \
		-t ivod/web:local .

build-all: build-api build-web ## Builder toutes les images

# ───────────────────────────────────────────────────────────────────────────────
##@ Nettoyage
# ───────────────────────────────────────────────────────────────────────────────

clean: ## Supprimer les conteneurs et images inutilisées
	$(DC_DEV) down --remove-orphans
	docker image prune -f

clean-all: ## Nettoyage complet (conteneurs + volumes + images — DESTRUCTIF)
	@printf "$(YELLOW)⚠ Suppression de TOUT (conteneurs, volumes, images). Continuer ? [y/N] $(RESET)" && read ans && [ $${ans:-N} = y ]
	$(DC_DEV) down -v --remove-orphans
	docker image prune -af

# ───────────────────────────────────────────────────────────────────────────────
# Vérifications des fichiers .env requis
# ───────────────────────────────────────────────────────────────────────────────

check-env-infra:
	@test -f .env || (printf "$(YELLOW)⚠  Fichier .env manquant$(RESET)\n   → cp .env.example .env\n" && exit 1)

check-env-dev: check-env-infra
	@test -f apps/api/.env || (printf "$(YELLOW)⚠  Fichier apps/api/.env manquant$(RESET)\n   → cp apps/api/.env.example apps/api/.env\n" && exit 1)
	@mkdir -p logs/api

check-env-staging:
	@test -f .env.staging || (printf "$(YELLOW)⚠  Fichier .env.staging manquant$(RESET)\n   → cp .env.staging.example .env.staging\n" && exit 1)
	@mkdir -p logs/api

check-env-prod:
	@test -f .env.prod || (printf "$(YELLOW)⚠  Fichier .env.prod manquant$(RESET)\n   → cp .env.prod.example .env.prod\n" && exit 1)
	@mkdir -p logs/api
