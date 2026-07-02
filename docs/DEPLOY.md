# iVOD — Déploiement production (AlmaLinux 10 / xselcloud.com)

Serveur : `ivod-preprod-srv01.xselcloud.com` (AlmaLinux 10.2, dnf, firewalld, SELinux enforcing)
Dossier projet : `/var/www/ivod`
Architecture : **100 % dockerisée** — Nginx (reverse proxy + TLS), API NestJS
en 2 réplicas (`api_1`/`api_2`), Web Next.js, Postgres, Redis, MinIO. Voir
`apps/api/docker-compose.prod.yml` et `apps/web/docker-compose.prod.yml`.

Domaine unique, routage par chemin (pas de sous-domaine `api.`/`www.`) :
`https://ivod-preprod-srv01.xselcloud.com` — `/` → web, `/api/v1` + `/socket.io/` → API.

Ce document couvre le **serveur** (première mise en route + limites infra).
Pour l'automatisation CI/CD (déploiement déclenché par push GitHub, mises à
jour OTA mobile, secrets à créer) → voir **`docs/CI-CD.md`**. Pour les tâches
opérationnelles restantes après le premier déploiement (Sentry, monitoring,
bascule Wasabi, blocages mobile store) → voir **`docs/OPERATIONS.md`**.

---

## Checklist de mise en production (ordre d'exécution)

- [ ] **DNS** : `ivod-preprod-srv01.xselcloud.com` → IP publique du VPS (A/AAAA). Vérifier : `dig +short ivod-preprod-srv01.xselcloud.com`.
- [ ] **`.env` de prod** : remplir localement les **3 blocs TODO** de `apps/api/.env.production` (SMTP, Paystack, Sentry — identifiants externes que je ne peux pas générer).
- [ ] **Accès SSH par clé** vers `root@ivod-preprod-srv01.xselcloud.com`
- [ ] **Première installation** depuis votre Mac :
  ```bash
  ./scripts/remote-bootstrap.sh --dry-run   # prévisualiser
  ./scripts/remote-bootstrap.sh               # exécuter
  ```
  Enchaîne : rsync du code → copie de `.env.production` en `.env` (si absent) →
  bootstrap serveur (Docker, TLS, stack, seed si base vide, smoke test HTTP).
- [ ] **Smoke test fonctionnel** (manuel) : inscription OTP, upload image/vidéo,
  notification temps réel entre deux navigateurs.
- [ ] **`ALLOW_PAYMENT_SIMULATION=false`** une fois Paystack validé en conditions réelles.
- [ ] **Monitoring** (optionnel) : `make monitoring-up` — voir `docs/OPERATIONS.md`.

**Déploiements suivants** : `git push origin main` → GitHub Actions.
Secours local : `make remote-deploy` (voir `docs/CI-CD.md`).

---

## 0. Limites connues (à valider avant mise en prod réelle)

- **HA partielle** : `api_1`/`api_2` tournent sur le **même hôte Docker**. Ça
  couvre le zero-downtime *de déploiement* (recréation d'une instance pendant
  que l'autre sert le trafic), pas une vraie haute dispo multi-nœud (panne
  matérielle du VPS = coupure totale).
- **Rewrite serveur `/media`** (proxy d'assets média côté Next.js,
  `next.config.ts`) cible `api_1` directement, pas l'upstream Nginx
  équilibré — si `api_1` est en cours de recréation, ce chemin précis échoue
  même si `api_2` est sain. Impact mineur (n'affecte que le proxy d'assets, pas
  le reste de l'app) ; à corriger plus tard si ça devient gênant.
- **`JWT_VERIFY_SECRET`** est fourni à la fois en `ARG` de build (inliné si
  Next 16 traite le middleware en Edge runtime) et en variable runtime
  (si le middleware tourne en Node.js runtime) — ceinture et bretelles tant
  que le comportement exact de Next 16 sur ce point n'est pas vérifié en prod.
- **Pas de `ecosystem.config.js`/PM2 dans ce projet** — le web tourne en
  conteneur Docker (voir `apps/web/docker-compose.prod.yml`), pas en process
  PM2. `deploy.sh` (racine du repo) automatise le déploiement — voir section 5.
- **`deploy.sh` ne fait pas de rollback automatique** : si `api_2` ne devient
  jamais healthy, le script s'arrête en laissant l'instance précédente en
  service. Rollback manuel : `make remote-deploy` depuis un commit antérieur.
- **MinIO est exposé publiquement pour les uploads uniquement**, via
  `/ivod-videos/` et `/ivod-assets/` (voir `apps/api/nginx/nginx.prod.conf`) —
  requis par les presigned PUT/GET de `MinioService` (upload direct
  navigateur : `MINIO_PUBLIC_ENDPOINT`/`MINIO_PUBLIC_PORT`/`MINIO_PUBLIC_USE_SSL`
  dans `apps/api/.env`). La *lecture/affichage* des assets, elle, passe par
  une route same-origin `/media?bucket=...&key=...` proxifiée par l'API
  (`apps/web/lib/utils/assets.ts`) — les deux mécanismes coexistent, ne pas
  confondre "MinIO jamais exposé" (faux depuis l'ajout de ces 2 locations)
  avec "MinIO jamais utilisé pour l'affichage" (toujours vrai).

---

## 1. Certbot / Let's Encrypt

### 1.1 Installation (AlmaLinux 10, dnf + EPEL)

```bash
dnf install -y epel-release
dnf install -y certbot
certbot --version   # vérifier l'installation
```

### 1.2 Premier certificat — méthode webroot (bootstrap)

Nginx étant dockerisé et pas encore démarré au tout premier déploiement, on
utilise un conteneur Nginx temporaire pour répondre au challenge HTTP-01,
plutôt que `--standalone` (qui empêcherait tout renouvellement automatique
une fois le vrai Nginx en place sur les ports 80/443) :

```bash
cd /var/www/ivod
mkdir -p apps/api/certbot-webroot

# Nginx temporaire, juste pour servir /.well-known/acme-challenge/
docker run --rm -d --name certbot-bootstrap -p 80:80 \
  -v "$PWD/apps/api/certbot-webroot:/usr/share/nginx/html:ro" \
  nginx:1.28-alpine

certbot certonly --webroot -w apps/api/certbot-webroot \
  -d ivod-preprod-srv01.xselcloud.com \
  --email training@xsel-services.com \
  --agree-tos --non-interactive

docker stop certbot-bootstrap

# Nginx (le vrai, dockerisé) lit les certs depuis apps/api/nginx/ssl/, pas
# directement /etc/letsencrypt/ — donc copie explicite :
cp /etc/letsencrypt/live/ivod-preprod-srv01.xselcloud.com/fullchain.pem apps/api/nginx/ssl/
cp /etc/letsencrypt/live/ivod-preprod-srv01.xselcloud.com/privkey.pem   apps/api/nginx/ssl/

make prod-build   # démarre nginx + api_1 + api_2 + web + infra
```

### 1.3 Renouvellement automatique

`certbot` sur AlmaLinux installe son propre timer systemd
(`certbot-renew.timer`, exécute `certbot renew` 2x/jour). Comme le premier
certificat a été obtenu en mode `--webroot`, `certbot renew` réutilisera
automatiquement ce même plugin (paramètres stockés dans
`/etc/letsencrypt/renewal/ivod-preprod-srv01.xselcloud.com.conf`) — **à
condition que le vrai Nginx (dockerisé) serve bien
`/.well-known/acme-challenge/` depuis `apps/api/certbot-webroot`**, ce qui
est déjà le cas dans `apps/api/nginx/nginx.prod.conf` (location dédiée) et
`apps/api/docker-compose.prod.yml` (volume `./certbot-webroot:/var/www/certbot:ro,z`).

```bash
systemctl status certbot-renew.timer   # doit être "active"
systemctl enable --now certbot-renew.timer   # si pas déjà activé

# Test à blanc (ne renouvelle rien, valide juste que ça fonctionnerait)
certbot renew --dry-run
```

Après un renouvellement réussi, les nouveaux certs sont dans
`/etc/letsencrypt/live/.../` mais **le Nginx dockerisé regarde
`apps/api/nginx/ssl/`** — il faut donc copier + recharger. Le script
`scripts/certbot-renew-hook.sh` (versionné dans le repo) fait exactement ça ;
tout script placé dans `renewal-hooks/deploy/` est exécuté automatiquement
par certbot après un renouvellement réussi (pas besoin de `--deploy-hook`
manuel) — on se contente donc d'y créer un lien symbolique :

```bash
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
ln -s /var/www/ivod/scripts/certbot-renew-hook.sh \
  /etc/letsencrypt/renewal-hooks/deploy/ivod-nginx.sh
```

Aucune coupure : `nginx -s reload` recharge la config/les certs sans couper
les connexions en cours. Le lien symbolique pointe vers le fichier du repo
donc il suit automatiquement toute future modification du script (après un
déploiement), pas besoin de le recréer.

---

## 2. Firewalld

Une fois Nginx (dockerisé, ports publiés 80/443) en place, fermer l'accès
public direct à l'API (3000) et au web (3001) — ils ne doivent être
joignables qu'en interne au réseau Docker `ivod-prod`, jamais depuis
l'extérieur (ce qui est déjà le cas par défaut : `docker-compose.prod.yml` ne
publie PAS ces ports sur l'hôte — les lignes `ports:` sont commentées. Le
firewalld ci-dessous est une défense en profondeur si jamais quelqu'un les
décommente un jour, ou si un autre process écoute sur ces ports en dehors de Docker).

```bash
firewall-cmd --state   # vérifier que firewalld tourne

# Autoriser seulement SSH, HTTP, HTTPS publiquement
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Retirer tout accès public explicite qui traînerait sur 3000/3001
firewall-cmd --permanent --remove-port=3000/tcp 2>/dev/null || true
firewall-cmd --permanent --remove-port=3001/tcp 2>/dev/null || true

firewall-cmd --reload
firewall-cmd --list-all
```

⚠️ **Piège classique Docker + firewalld** : Docker manipule directement les
chaînes `iptables`/`nftables` (via le daemon) et **contourne souvent les
règles firewalld** pour les ports que vous publiez explicitement avec
`ports: "X:Y"` dans un compose file — c'est le compose file qui décide de ce
qui est exposé, pas firewalld. Autrement dit : la vraie protection contre
l'exposition de 3000/3001 est de **ne pas les publier** dans
`docker-compose.prod.yml` (déjà le cas — voir les lignes commentées), pas
uniquement le firewall. Firewalld reste utile pour bloquer tout le reste
(scans de ports, autres services accidentellement démarrés hors Docker).

---

## 3. SELinux

Ce point est **largement N/A** avec l'architecture 100 % dockerisée choisie
ici (contrairement à un Nginx system-level, où `httpd_can_network_connect`
serait indispensable pour que le processus nginx sous le domaine SELinux
`httpd_t` puisse ouvrir des connexions sortantes vers l'API/le web). Le
Nginx tourne ici dans un conteneur sous le domaine `container_t`, déjà
autorisé par la politique Docker par défaut à faire des connexions réseau —
**aucun `setsebool` requis pour le reverse-proxy en tant que tel**.

Le seul point SELinux réellement pertinent avec des conteneurs : les
**bind-mounts** (répertoires hôte montés dans un conteneur) doivent être
relabellisés au bon contexte SELinux, sinon le conteneur reçoit un
`Permission denied` en lisant/écrivant dedans. C'est géré par le suffixe
`:z` (partagé) déjà ajouté aux volumes bind-mount de
`apps/api/docker-compose.prod.yml` (`nginx/ssl`, `certbot-webroot`,
`logs/*`) — Docker relabellise automatiquement au démarrage du conteneur.
Rien à faire manuellement, mais si un `Permission denied` apparaît malgré
tout sur un de ces montages :

```bash
# Diagnostic : voir si SELinux bloque effectivement quelque chose
ausearch -m avc -ts recent 2>/dev/null | grep nginx

# Relabelling manuel de secours (si le suffixe :z ne suffit pas, rare)
semanage fcontext -a -t container_file_t "/var/www/ivod/apps/api/nginx/ssl(/.*)?"
restorecon -Rv /var/www/ivod/apps/api/nginx/ssl
```

---

## 4. Zero-downtime API — procédure de redéploiement

`deploy.replicas` (Swarm) n'a aucun effet sous `docker compose up` classique
— d'où le choix de 2 services nommés distincts `api_1`/`api_2` partageant la
même image (voir `apps/api/docker-compose.prod.yml`). Nginx (`upstream
api_backend`, `least_conn` + `max_fails=3 fail_timeout=10s`) bascule sur
l'instance saine pendant que l'autre est recréée.

Cette procédure est entièrement automatisée par `deploy.sh` (section 5) —
manuellement, ce serait :

```bash
cd /var/www/ivod
COMPOSE="docker compose --env-file apps/api/.env -f apps/api/docker-compose.prod.yml -f apps/web/docker-compose.prod.yml"

# 1. Rebuild + recréation d'api_1 seul — Nginx détecte l'échec des requêtes
#    vers api_1 pendant l'indisponibilité (health check PASSIF) et route
#    tout le trafic vers api_2 entre-temps.
$COMPOSE up -d --no-deps --build api_1

# 2. Attendre que api_1 soit "healthy" avant de toucher à api_2
docker inspect --format='{{.State.Health.Status}}' ivod-api-1-prod
# Répéter jusqu'à "healthy", puis :

$COMPOSE up -d --no-deps --build api_2
```

Le web (une seule instance) et le worker vidéo (`migrate deploy` est déjà
protégé par un verrou Prisma, voir plus haut) subissent une coupure courte —
seule l'API a été dédoublée dans ce livrable, conformément à la demande
initiale.

---

## 5. `deploy.sh` — rebuild de la stack Docker

`deploy.sh` (racine du dépôt) rebuild la stack en rolling update. Il est
appelé automatiquement par le pipeline CD après le transfert rsync du code.

Exécution manuelle sur le serveur (`/var/www/ivod`) :

```bash
./deploy.sh          # stack standard (MinIO local)
./deploy.sh --s3     # stockage S3 externe (Wasabi/Backblaze)
```

Étapes :

1. `make prod-setup` — répertoires de logs, réseau Docker.
2. Rolling update `api_1` → `api_2` : recréation séquentielle, attente
   `healthy` (timeout 60 s par instance).
3. Recréation du `video-worker` et du `web`.
4. `nginx -t` puis `nginx -s reload` si la configuration est valide.

Le code doit déjà être à jour sur le disque (transféré par le CD ou
`make remote-deploy`). Pas de `git pull` — voir `docs/CI-CD.md`.

Pas de rollback automatique : en cas d'échec, l'instance précédente reste
active côté Nginx. Rollback manuel : redéployer un commit antérieur via
`make remote-deploy` depuis la branche souhaitée.

Comme il n'y a pas de PM2 dans ce projet (voir limite en section 0), aucune
étape `pm2 reload` n'est nécessaire — le web est un service Docker comme
les autres (`$COMPOSE up -d --no-deps --build web`).

---

## 6. Sauvegardes automatisées (Postgres + MinIO)

Deux scripts versionnés dans le repo, à planifier via systemd timer :

- **`scripts/backup-postgres.sh`** — `pg_dump` via `docker exec`, gzip,
  rotation (`BACKUP_RETENTION_DAYS`, défaut 14 jours). Dumps horodatés
  (chacun est un point de restauration complet et indépendant).
- **`scripts/backup-minio.sh`** — `mc mirror` (conteneur éphémère
  `minio/mc`, rien à installer sur l'hôte) vers un répertoire local.
  Incrémental par nature (pas de rotation nécessaire) — voir la limite
  documentée en tête du script : ça protège contre une suppression
  accidentelle, PAS contre une panne disque totale tant que la destination
  reste sur le même disque.

Les deux lisent leur config depuis `apps/api/.env` (mêmes `POSTGRES_USER`,
`MINIO_ROOT_USER`, etc. que le reste de la stack).

### Installation (systemd timer, même pattern que le renouvellement certbot)

```bash
cat > /etc/systemd/system/ivod-backup-postgres.service <<'EOF'
[Unit]
Description=IVOD - Sauvegarde PostgreSQL
[Service]
Type=oneshot
WorkingDirectory=/var/www/ivod
ExecStart=/var/www/ivod/scripts/backup-postgres.sh
EOF

cat > /etc/systemd/system/ivod-backup-postgres.timer <<'EOF'
[Unit]
Description=IVOD - Sauvegarde PostgreSQL quotidienne
[Timer]
OnCalendar=daily
Persistent=true
[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/ivod-backup-minio.service <<'EOF'
[Unit]
Description=IVOD - Miroir MinIO
[Service]
Type=oneshot
WorkingDirectory=/var/www/ivod
ExecStart=/var/www/ivod/scripts/backup-minio.sh
EOF

cat > /etc/systemd/system/ivod-backup-minio.timer <<'EOF'
[Unit]
Description=IVOD - Miroir MinIO toutes les 6h
[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now ivod-backup-postgres.timer ivod-backup-minio.timer
systemctl list-timers | grep ivod-backup
```

`Persistent=true` rattrape une exécution manquée si le serveur était éteint
au moment prévu (au prochain démarrage). Test manuel avant de faire
confiance au timer :

```bash
systemctl start ivod-backup-postgres.service && journalctl -u ivod-backup-postgres.service -n 50
systemctl start ivod-backup-minio.service    && journalctl -u ivod-backup-minio.service -n 50
```

### Limite connue

Ces backups restent **sur le même disque** que les données qu'ils
sauvegardent — protège contre une suppression/corruption logique, pas contre
une panne disque ou une perte du VPS. Pour une vraie durabilité, ajouter une
étape de synchronisation de `apps/api/backups/` vers un stockage distinct
(un autre VPS via `rsync`, ou un bucket S3 via `rclone`/`aws s3 sync`) — non
inclus ici, à ajouter séparément si le besoin se confirme.
