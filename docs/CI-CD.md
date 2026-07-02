# iVOD — Pipeline CI/CD complet (API + Web + Mobile)

Ce document couvre ce que je **ne peux pas configurer moi-même** (secrets
GitHub, règles d'approbation) — tout le reste (fichiers `.yml`, scripts) est
déjà en place dans le repo. Voir aussi `docs/DEPLOY.md` (mise en route
serveur) et `docs/OPERATIONS.md` (tâches restantes, dont 2 blocages mobile
avant une vraie sortie store — § 5).

---

## 1. Vue d'ensemble — qu'est-ce qui se déclenche quand

| Déclencheur | Workflow | Job(s) | Automatique ? |
|---|---|---|---|
| Pull request vers `main`/`develop` | `ci.yml` | `changes`, `api`, `web`, `mobile` (lint+build) | Oui — bloque la PR si rouge |
| Push sur `develop` | `ci.yml` | idem + `eas-update` (branche `preview`) si mobile a changé | Oui |
| Push sur `main` | `ci.yml` | idem + `docker-api` (build+push GHCR) + `deploy-server` (⚠️ **approbation requise**, voir § 3) + `eas-update` (branche `production`) | CI auto, déploiement serveur **en pause** tant que non approuvé |
| Clic manuel "Run workflow" | `mobile-release.yml` | `build` (EAS Build natif iOS/Android) | Jamais automatique — coûte des crédits EAS + review store |

`deploy-server` exécute `./deploy.sh main` sur le serveur via SSH — c'est le
même script que vous pouvez lancer manuellement, juste déclenché par CI.
`eas-update` publie une mise à jour OTA (JS/assets uniquement, pas de review
store) — sûr par nature, donc automatique.

---

## 2. Secrets GitHub à créer (Settings → Secrets and variables → Actions)

Je ne peux pas les créer moi-même (pas d'accès à l'API GitHub depuis cet
environnement) — à ajouter manuellement :

| Secret | Valeur | Où l'obtenir |
|---|---|---|
| `PROD_HOST` | `ivod-preprod-srv01.xselcloud.com` | déjà connu |
| `PROD_USER` | `root` (ou un user dédié moins privilégié, recommandé à terme) | — |
| `PROD_PORT` | `22` (ou le port SSH réel si personnalisé) | — |
| `PROD_APP_DIR` | `/var/www/ivod` | déjà connu |
| `PROD_SSH_KEY` | Clé **privée** SSH dédiée au déploiement (PAS votre clé perso) | `ssh-keygen -t ed25519 -f deploy_key -N ""` en local, puis ajouter `deploy_key.pub` dans `~/.ssh/authorized_keys` du serveur, et coller le contenu de `deploy_key` (privée) dans ce secret |
| `EXPO_TOKEN` | Token d'accès Expo (scope "robot", pas votre login perso) | [expo.dev](https://expo.dev) → Account Settings → Access Tokens → Create |

`GITHUB_TOKEN` (utilisé par `docker-api` pour pousser vers GHCR) est fourni
automatiquement par GitHub, rien à créer.

### Générer une clé SSH dédiée au déploiement (recommandé, pas votre clé perso)

```bash
ssh-keygen -t ed25519 -f ivod_deploy_key -N "" -C "github-actions-deploy"
# Copier la clé publique sur le serveur :
ssh-copy-id -i ivod_deploy_key.pub root@ivod-preprod-srv01.xselcloud.com
# Coller le CONTENU de ivod_deploy_key (privée, sans .pub) dans le secret PROD_SSH_KEY
cat ivod_deploy_key
```

---

## 3. Environment GitHub "production" — approbation manuelle avant déploiement

Le job `deploy-server` référence `environment: production` dans `ci.yml`.
Sans configuration côté GitHub, ça n'a **aucun effet** (le job s'exécute
immédiatement dès que les conditions sont remplies). Pour activer la pause
d'approbation qu'on a décidée ensemble :

1. GitHub → repo → **Settings** → **Environments** → **New environment**
2. Nommer exactement `production` (doit correspondre à `environment:` dans `ci.yml`)
3. Cocher **Required reviewers** → ajouter votre compte (ou celui d'un lead)
4. (Optionnel) **Wait timer** — délai fixe avant exécution, en plus/à la place des reviewers
5. Sauvegarder

À partir de là : un push sur `main` déclenche CI normalement, mais le job
`deploy-server` reste **"Waiting"** dans l'onglet Actions jusqu'à ce qu'un
reviewer clique **"Review deployments" → "Approve and deploy"**.

---

## 4. Vérifications avant le premier push qui déclenche tout ça

- [ ] Les 6 secrets du § 2 sont créés
- [ ] L'environment `production` du § 3 est configuré avec au moins 1 reviewer
- [ ] La clé SSH dédiée est bien autorisée sur le serveur (`ssh -i ivod_deploy_key root@ivod-preprod-srv01.xselcloud.com true` doit réussir)
- [ ] `apps/api/.env` existe déjà sur le serveur et est rempli (voir `docs/DEPLOY.md`) — `deploy.sh` ne le crée pas, il suppose qu'il existe déjà
- [ ] Le serveur a un accès réseau sortant vers GitHub (`deploy.sh` fait `git fetch origin` depuis le serveur lui-même)

---

## 5. Ce qui reste manuel, volontairement

- **`eas submit`** (soumission App Store/Play Store) : pas automatisé du
  tout — `apps/mobile/eas.json` a encore des identifiants placeholder
  (`ascAppId`, `appleTeamId`, `google-service-account.json`). Une fois les
  vrais identifiants configurés, ce sera un choix séparé (manuel ou lié à
  `mobile-release.yml`).
- **Builds natifs mobile** : toujours `workflow_dispatch` manuel (§ 1) —
  décision prise ensemble pour éviter de gaspiller des crédits EAS ou de
  soumettre une build cassée aux stores sans review humaine.
- **Rollback serveur** : `deploy-server` ne fait pas de rollback automatique
  (`deploy.sh` lui-même n'en fait pas non plus, voir `docs/DEPLOY.md` § 0) —
  en cas de souci, ré-approuver un déploiement sur un commit précédent, ou
  se connecter en SSH et lancer `./deploy.sh <sha-précédent>` directement.
