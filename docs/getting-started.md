# Démarrage du projet iVOD

Guide pratique pour démarrer, migrer et gérer les données en développement.

---

## Prérequis

| Outil | Version | Vérification |
|-------|---------|-------------|
| Docker Desktop | 24+ | `docker --version` |
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |

---

## Installation initiale (une seule fois)

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

```bash
# Variables infra (postgres, redis, minio)
cp .env.example .env

# Secrets API (JWT, Stripe, Mux, SMTP…)
cp apps/api/.env.example apps/api/.env
```

Ouvrir les deux fichiers et remplir les valeurs.  
Les variables obligatoires sont marquées `CHANGE_ME_*`.

---

## Démarrer le projet

```bash
make dev
```

Cette commande démarre **tout dans le bon ordre** :

```
1. PostgreSQL   → healthcheck OK
2. Redis        → healthcheck OK
3. MinIO        → healthcheck OK + bucket créé
4. API          → prisma generate
               → prisma migrate deploy   (migrations)
               → prisma:seed:all         (données initiales)
               → nest start --watch      (hot reload)
5. Web          → next dev               (hot reload)
6. Adminer      → interface base de données
```

---

## URLs disponibles

| Service | URL | Notes |
|---------|-----|-------|
| API | http://localhost:3000 | |
| Swagger | http://localhost:3000/api/v1/docs | Documentation interactive |
| Web | http://localhost:3001 | |
| MinIO Console | http://localhost:9001 | Explorateur de fichiers S3 |
| Adminer | http://localhost:8080 | Interface base de données |
| Prisma Studio | http://localhost:5555 | Via `make studio` |

**Identifiants MinIO Console :** `minioadmin` / *(valeur de `MINIO_ROOT_PASSWORD` dans `.env`)*

---

## Données initiales (seeds)

Les seeds s'exécutent automatiquement au démarrage. Ils utilisent des `upsert` — ils sont donc **idempotents** (relancer ne crée pas de doublons).

### Ce qui est créé

**Catégories** (`seed-categories.js`)
Catégories éditoriales du catalogue : HUMOUR, SERIE, FILM, DOCUMENTAIRE, LIVE, CLIP, etc.

**Rôles et permissions** (`seed-rbac.js`)

| Rôle | Permissions |
|------|------------|
| `ADMIN` | `*` (toutes les permissions) |
| `CREATOR` | content.read/create/update/delete, episode.*, upload, profile.* |
| `VIEWER` | content.read, favorite.*, follow.*, subscription.*, payment.* |

**Ayants droit de référence** (`seed-rightsholders.js`)
Producteurs et distributeurs par défaut.

**Utilisateurs de test** (`seed-users.js`)

| Email | Rôle | Plan | Mot de passe |
|-------|------|------|-------------|
| `wangny.ouangni@gmail.com` | ADMIN | PREMIUM_PLUS | `Password123!` |
| `romaric747@gmail.com` | CREATOR | PREMIUM | `Password123!` |
| `josephyobouet68@gmail.com` | VIEWER | FREE | `Password123!` |

---

## Commandes du quotidien

### Démarrer / arrêter

```bash
make dev              # Tout démarrer (API + Web + Infra) avec hot reload
make dev-api          # Infra + API seulement (sans le Web)
make infra            # Infrastructure seule (postgres, redis, minio)
make dev-d            # Démarrer en arrière-plan (detached)
make down             # Arrêter proprement (conserve les données)
```

### Surveiller

```bash
make ps               # Lister les services actifs et leur état
make logs             # Suivre tous les logs en temps réel
make logs-api         # Logs de l'API seulement
make logs-web         # Logs du Web seulement
make logs-db          # Logs de PostgreSQL
```

### Base de données

```bash
make migrate          # Créer + appliquer une nouvelle migration (mode dev)
make migrate-deploy   # Appliquer les migrations sans en créer (mode deploy)
make seed             # Relancer tous les seeds
make studio           # Ouvrir Prisma Studio sur http://localhost:5555
make prisma-generate  # Régénérer le client Prisma
```

### Shells interactifs

```bash
make shell-api        # Shell bash dans le conteneur API
make shell-web        # Shell bash dans le conteneur Web
make shell-db         # psql dans PostgreSQL
make shell-redis      # redis-cli
```

### Si tu ajoutes un package npm

```bash
# 1. Ajouter dans le bon package.json
npm install <package> --workspace @ivod/api

# 2. Rebuild l'image et redémarrer
make dev-build
```

---

## Migrations Prisma

### Créer une migration après un changement de schéma

```bash
# 1. Modifier apps/api/prisma/schema.prisma

# 2. Créer la migration (remplacer "nom_migration" par un nom descriptif)
make migrate-create NAME=nom_migration

# Exemples de noms :
make migrate-create NAME=add_content_language
make migrate-create NAME=add_creator_earnings_table
make migrate-create NAME=rename_watch_history_fields
```

La migration est créée dans `apps/api/prisma/migrations/` et appliquée automatiquement.

### Migrations existantes

| Migration | Contenu |
|-----------|---------|
| `20260323111959_init` | Schéma complet initial (toutes les tables) |
| `20260330093632_add_season_model` | Ajout du modèle `Season` |

---

## Réinitialisation complète

```bash
# ⚠ Supprime toutes les données (conteneurs + volumes)
make down-v

# Repartir de zéro
make dev
```

---

## Environnements

| Environnement | Commande | Fichier .env requis |
|---------------|----------|---------------------|
| **Développement** | `make dev` | `.env` + `apps/api/.env` |
| **Staging** | `make staging` | `.env.staging` |
| **Production** | `make prod` | `.env.prod` |
| **Infra seule** | `make infra` | `.env` |

```bash
# Setup staging
cp .env.staging.example .env.staging
# → remplir les valeurs
make staging

# Setup prod
cp .env.prod.example .env.prod
# → remplir les valeurs (NE PAS commiter ce fichier)
make prod
```

---

## Toutes les commandes

```bash
make help
```
