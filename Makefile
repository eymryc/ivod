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
# =============================================================================

DEV_COMPOSE  := apps/api/docker-compose.dev.yml
PROD_COMPOSE := -f apps/api/docker-compose.prod.yml -f apps/web/docker-compose.prod.yml

.PHONY: help install \
        dev-up dev-down dev-build dev-rebuild dev-logs dev-restart dev-clean \
        api-logs video-worker-logs api-shell \
        db-generate db-migrate db-migrate-new db-seed db-reset db-adminer db-studio \
        prod-up prod-down prod-build prod-logs \
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
prod-up: ## Démarre l'environnement de production
	docker compose $(PROD_COMPOSE) up -d

prod-build: ## Build et démarre la production
	docker compose $(PROD_COMPOSE) up -d --build

prod-down: ## Arrête la production
	docker compose $(PROD_COMPOSE) down

prod-logs: ## Suit les logs de production
	docker compose $(PROD_COMPOSE) logs -f

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
