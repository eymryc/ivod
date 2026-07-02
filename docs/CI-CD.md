# iVOD — CI/CD

Voir aussi `docs/DEPLOY.md` (première mise en route serveur).

---

## Architecture (2 workflows)

```
push/PR ──► ci.yml          lint + build (api, web, mobile)
push main ─► ci.yml job deploy ──► deploy.yml   rsync + ./deploy.sh
```

| Fichier | Rôle |
|---|---|
| `.github/workflows/ci.yml` | **CI** — lint, build, push image API GHCR, OTA mobile |
| `.github/workflows/deploy.yml` | **CD** — rsync vers le VPS + rebuild Docker (appelé par ci.yml) |

---

## Pourquoi rsync dans le CD ?

GitHub Actions **ne peut pas** simplement faire `git pull` sur le serveur :

- le repo est souvent **privé** (pas de credentials git sur le VPS) ;
- le **web Next.js** doit être buildé **sur le serveur** avec `apps/api/.env` (les `NEXT_PUBLIC_*` sont inlinées au build Docker).

Le flux CD est donc : **Actions rsync le code → `deploy.sh` rebuild les containers**.

`make remote-deploy` fait exactement la même chose en local (secours si billing GitHub bloqué).

---

## Scripts (le minimum)

| Script | Quand |
|---|---|
| `deploy.sh` | Sur le serveur — rebuild Docker uniquement |
| `scripts/rsync-to-server.sh` | Transfert code (utilisé par Actions + remote-deploy) |
| `scripts/remote-deploy.sh` | Fallback local = même flux que Actions |
| `scripts/remote-bootstrap.sh` | **Une seule fois** — première install serveur |
| `scripts/prod-seed.sh` | Peupler la base (`make prod-db-seed`) |

Pas de git sur le serveur pour déployer — le code arrive par rsync.

---

## Déclencheurs

| Événement | Résultat |
|---|---|
| PR vers `main`/`develop` | CI uniquement (lint + build) |
| Push sur `main` | CI + **Deploy** (après build réussi, si api/web/ops modifiés) |
| Push sur `develop` | CI + OTA mobile preview |
| Manuel | `mobile-release.yml` — build natif store |

Le job `deploy` dans ci.yml appelle `deploy.yml` et attend l'environment `production` (approbation manuelle optionnelle).

---

## Secrets GitHub

| Secret | Valeur |
|---|---|
| `PROD_HOST` | `ivod-preprod-srv01.xselcloud.com` |
| `PROD_USER` | `root` |
| `PROD_PORT` | `22` |
| `PROD_APP_DIR` | `/var/www/ivod` |
| `PROD_SSH_KEY` | Clé privée SSH dédiée déploiement |
| `EXPO_TOKEN` | Token Expo (mobile OTA) |

---

## Billing GitHub

Si les jobs ne démarrent pas (*account locked due to billing issue*), réglez la facturation GitHub, ou utilisez temporairement :

```bash
make remote-deploy
```

---

## Checklist

- [ ] Billing GitHub actif
- [ ] Secrets § ci-dessus configurés
- [ ] `apps/api/.env` rempli sur le serveur
- [ ] Environment `production` + reviewers (optionnel)
- [ ] `make prod-db-seed` après première install
