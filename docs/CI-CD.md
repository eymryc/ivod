# iVOD — Pipeline CI/CD complet (API + Web + Mobile)

Voir aussi `docs/DEPLOY.md` (mise en route serveur) et `docs/OPERATIONS.md`.

---

## 1. Les 3 façons de déployer

| Méthode | Quand l'utiliser | Commande |
|---|---|---|
| **remote-deploy** (recommandé) | Depuis votre Mac, CI bloquée, déploiement immédiat | `make remote-deploy` |
| **GitHub Actions** | Push sur `main` (après approbation) | Automatique via `deploy-server` |
| **deploy.sh sur serveur** | Serveur avec git remote valide + accès GitHub | `ssh root@… 'cd /var/www/ivod && ./deploy.sh main'` |

### Pourquoi rsync plutôt que `git fetch` sur le serveur ?

L'ancienne approche (`./deploy.sh main` = `git fetch` sur le serveur) échouait souvent :

- dépôt git vide sans `origin` (bootstrap partiel) ;
- repo GitHub **privé** sans credentials sur le serveur ;
- divergence entre le code rsyncé et l'état git.

**Nouvelle approche** : la CI et `remote-deploy.sh` font un **rsync** du code puis `./deploy.sh --no-sync` (rebuild Docker uniquement). Le git sur le serveur devient optionnel.

---

## 2. Ce qui se déclenche sur GitHub

| Déclencheur | Workflow | Jobs |
|---|---|---|
| PR vers `main`/`develop` | `ci.yml` | lint + build api/web/mobile |
| Push sur `main` | `ci.yml` | ci + `docker-api` + **`deploy-server`** (rsync + rebuild) + `eas-update` |
| Manuel | `mobile-release.yml` | build natif EAS |

### ⚠️ Billing GitHub

Si les jobs ne démarrent pas avec le message *"account is locked due to a billing issue"*, **aucun workflow ne peut tourner** — réglez la facturation dans GitHub → Settings → Billing, puis relancez le workflow.

En attendant : `make remote-deploy` depuis votre Mac.

---

## 3. Secrets GitHub (Settings → Secrets → Actions)

| Secret | Valeur |
|---|---|
| `PROD_HOST` | `ivod-preprod-srv01.xselcloud.com` |
| `PROD_USER` | `root` |
| `PROD_PORT` | `22` |
| `PROD_APP_DIR` | `/var/www/ivod` |
| `PROD_SSH_KEY` | Clé privée SSH dédiée au déploiement |
| `EXPO_TOKEN` | Token Expo (mobile OTA) |

```bash
ssh-keygen -t ed25519 -f ivod_deploy_key -N "" -C "github-actions-deploy"
ssh-copy-id -i ivod_deploy_key.pub root@ivod-preprod-srv01.xselcloud.com
# Coller ivod_deploy_key (privée) dans PROD_SSH_KEY
```

---

## 4. Environment "production" (approbation manuelle)

Settings → Environments → `production` → **Required reviewers**.

Sans ça, `deploy-server` s'exécute immédiatement après un push sur `main`.

---

## 5. Première mise en route vs déploiements suivants

| Étape | Script |
|---|---|
| **Première fois** | `make remote-bootstrap` (rsync + certbot + `make prod-build` + seed si base vide) |
| **Déploiements suivants** | `make remote-deploy` (depuis Mac) ou CI `deploy-server` |
| **Seed manuel** | `make prod-db-seed` (sur le serveur) |
| **Réparer git cassé** | `./scripts/repair-server-git.sh` (sur le serveur) |

---

## 6. Checklist avant le premier push CI

- [ ] Billing GitHub actif (sinon utiliser `make remote-deploy`)
- [ ] Les 6 secrets du § 3 créés
- [ ] Environment `production` configuré (optionnel)
- [ ] `apps/api/.env` rempli sur le serveur
- [ ] `ssh -i ivod_deploy_key root@ivod-preprod-srv01.xselcloud.com true` réussit
