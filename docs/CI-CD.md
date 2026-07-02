# iVOD — CI/CD

Pipeline GitHub Actions pour l'intégration continue (lint, build) et le
déploiement continu (rsync + rebuild Docker sur le VPS).

Documentation complémentaire :
- `docs/DEPLOY.md` — première mise en route du serveur
- `docs/OPERATIONS.md` — monitoring, sauvegardes, tâches récurrentes

---

## Vue d'ensemble

```
                    ┌─────────────────────────────────────────┐
  pull_request      │  ci.yml                                 │
  push develop ────►│  • changes (paths-filter)               │
  push main         │  • api / web / mobile (lint + build)    │
                    │  • docker-api (push image GHCR)         │
                    │  • eas-update (OTA mobile)              │
                    │  • deploy ──────► deploy.yml (CD)       │
                    └─────────────────────────────────────────┘
                                          │
                                          ▼
                              rsync → ./deploy.sh (sur le VPS)
```

| Workflow | Fichier | Responsabilité |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Qualité du code, build, artefacts |
| CD | `.github/workflows/deploy.yml` | Transfert du code et rebuild production |

Le job `deploy` de `ci.yml` appelle `deploy.yml` via `workflow_call`. Il ne
s'exécute que sur un **push vers `main`**, après un build réussi, et si
`apps/api`, `apps/web` ou l'infra ops ont changé.

---

## Pipeline détaillé

### Intégration continue (`ci.yml`)

| Job | Déclencheur | Action |
|---|---|---|
| `changes` | Toujours | Détecte les zones modifiées (api, web, mobile, ops) |
| `api` | `apps/api/**` | `pnpm lint` + `pnpm build` |
| `web` | `apps/web/**` | `npm lint` + `npm build` |
| `mobile` | `apps/mobile/**` | `pnpm lint` |
| `docker-api` | Push + api modifiée | Build et push de l'image API vers GHCR |
| `eas-update` | Push + mobile modifiée | Publication OTA Expo (preview / production) |
| `deploy` | Push `main` + api/web/ops | Appelle `deploy.yml` |

Les pull requests exécutent uniquement les jobs de build — jamais le déploiement.

### Déploiement continu (`deploy.yml`)

1. **Rsync** du dépôt vers `/var/www/ivod` (`scripts/rsync-to-server.sh`)
2. **Rebuild** de la stack Docker (`./deploy.sh` sur le serveur)
   - Rolling update `api_1` → `api_2` (zero-downtime)
   - Recréation du worker vidéo et du web
   - Reload Nginx si la configuration est valide

Le job s'exécute dans l'environment GitHub `production`. Configurez des
**Required reviewers** (Settings → Environments) pour exiger une approbation
manuelle avant chaque déploiement.

---

## Pourquoi le CD utilise rsync

Le déploiement ne repose pas sur `git pull` côté serveur :

| Contrainte | Impact |
|---|---|
| Dépôt privé | Le VPS n'a pas de credentials GitHub |
| Build Next.js | Les `NEXT_PUBLIC_*` sont injectées au build Docker depuis `apps/api/.env` sur le serveur |
| Simplicité | Un seul mécanisme de transfert, identique en CI et en local |

Le rsync fait partie du pipeline CD — ce n'est pas un contournement de GitHub
Actions, c'est son **mécanisme de livraison** vers le VPS.

---

## Scripts opérationnels

| Script | Exécution | Rôle |
|---|---|---|
| `deploy.sh` | Serveur | Rebuild Docker (rolling update) |
| `scripts/rsync-to-server.sh` | CI / local | Transfert du code vers le VPS |
| `scripts/remote-deploy.sh` | Local (`make remote-deploy`) | Secours — reproduit le job CD |
| `scripts/remote-bootstrap.sh` | Local (`make remote-bootstrap`) | Première installation du serveur |
| `scripts/prod-seed.sh` | Serveur (`make prod-db-seed`) | Initialisation de la base de données |

---

## Environment `production`

Le job CD (`deploy.yml`) s'exécute dans l'environment GitHub **`production`**.
À configurer dans : **Repository → Settings → Environments → production**.

### Protection rules (recommandé)

| Paramètre | Valeur recommandée | Votre config actuelle |
|---|---|---|
| **Required reviewers** | ✅ Activé — au moins 1 reviewer | ✅ `eymryc` |
| **Prevent self-review** | Optionnel (utile en équipe) | Désactivé — OK si vous êtes seul |
| **Wait timer** | 0 min (désactivé) | ✅ Désactivé |
| **Allow administrators to bypass** | ✅ Activé (secours urgence) | ✅ Activé |

Quand un push sur `main` déclenche le CD, le job apparaît en **« Waiting for review »**
dans l'onglet Actions. Cliquez **Review deployments → Approve and deploy**.

### Branches de déploiement

| Paramètre | Valeur recommandée |
|---|---|
| **Deployment branches** | **Selected branches** → ajouter uniquement `main` |

Évite qu'une branche de feature ne déploie en production par erreur.
Actuellement « No restriction » — à restreindre.

### Secrets de l'environment

Les secrets de déploiement doivent être définis **dans l'environment `production`**
(pas seulement au niveau du dépôt) — ils ne sont accessibles que lors d'un
déploiement approuvé.

**Settings → Environments → production → Environment secrets → Add secret**

| Secret | Valeur |
|---|---|
| `PROD_HOST` | `ivod-preprod-srv01.xselcloud.com` |
| `PROD_USER` | `root` |
| `PROD_PORT` | `22` |
| `PROD_APP_DIR` | `/var/www/ivod` |
| `PROD_SSH_KEY` | Contenu de la clé privée `ivod_deploy_key` |

Génération de la clé (si pas encore fait) :

```bash
ssh-keygen -t ed25519 -f ivod_deploy_key -N "" -C "github-actions-deploy"
ssh-copy-id -i ivod_deploy_key.pub root@ivod-preprod-srv01.xselcloud.com
cat ivod_deploy_key    # → coller dans PROD_SSH_KEY (sans le .pub)
```

Test :

```bash
ssh -i ivod_deploy_key root@ivod-preprod-srv01.xselcloud.com true
```

### Secrets au niveau du dépôt (reste global)

Ces secrets ne concernent pas le déploiement serveur — gardez-les dans
**Settings → Secrets and variables → Actions** (repository secrets) :

| Secret | Usage |
|---|---|
| `EXPO_TOKEN` | Job `eas-update` (OTA mobile) |

`GITHUB_TOKEN` est fourni automatiquement pour le push d'images vers GHCR.

---

## Quota GitHub Actions (plan Free)

Sur un dépôt **privé** : **2 000 minutes/mois** incluses (votre capture : 0 min
utilisées sur 2 000 — le quota n'est pas épuisé).

Si le message *« account is locked due to a billing issue »* apparaît malgré
0 min consommées :

1. **Billing → Payment information** — ajouter une carte (même en Free, parfois
   requis pour débloquer Actions sur dépôt privé)
2. **Billing → Spending limits** — vérifier qu'Actions n'est pas bloqué à 0 $
3. **Alternative** : passer le dépôt en **Public** (minutes Actions illimitées)
4. **Support GitHub** si le compte reste verrouillé sans raison apparente

En attendant : `make remote-deploy`

---

## Dépannage

### Le déploiement ne se déclenche pas

Vérifier que :

- le push cible la branche `main` ;
- au moins un filtre `api`, `web` ou `ops` est positif ;
- les jobs `api` et `web` sont en succès (ou skipped) ;
- l'environment `production` n'est pas en attente d'approbation ;
- les 5 secrets `PROD_*` sont bien dans **Environment secrets** (pas vides).

### Secours local

```bash
make remote-deploy          # rsync + rebuild (identique au job CD)
make remote-deploy -- --dry-run   # prévisualiser le transfert
```

---

## Checklist de mise en service

- [ ] **Billing** : carte ajoutée ou dépôt public (débloquer Actions)
- [ ] **Environment `production`** créé avec reviewer `eymryc`
- [ ] **Branches** : restreindre le déploiement à `main` uniquement
- [ ] **Environment secrets** : `PROD_HOST`, `PROD_USER`, `PROD_PORT`, `PROD_APP_DIR`, `PROD_SSH_KEY`
- [ ] **Repository secret** : `EXPO_TOKEN` (mobile OTA)
- [ ] **Serveur** : `apps/api/.env` rempli, clé SSH testée
- [ ] **Base** : `make prod-db-seed` (sur le serveur)
