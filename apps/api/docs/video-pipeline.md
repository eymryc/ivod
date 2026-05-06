# IVOD Video Pipeline (Robuste)

Ce document décrit le pipeline vidéo cible, avec les 4 premières étapes déjà intégrées dans l'API.

## Objectif

Construire un pipeline interne robuste pour ingestion, traitement et publication vidéo:

- upload source sécurisé (MinIO)
- orchestration jobs idempotents (probe/transcode/package)
- traçabilité complète en base
- préparation streaming adaptatif (HLS)

## Étapes implémentées (Phase 1)

### 1) Modèle de données pipeline (Prisma)

Ajouts dans `schema.prisma`:

- `VideoAsset` (source + état global)
- `VideoRendition` (sorties encodées)
- `VideoJob` (historique de jobs)
- enum `VideoAssetStatus`
- relation `Content -> videoAssets`

États prévus:

- `CREATED`
- `UPLOADED`
- `PROBING`
- `TRANSCODING`
- `PACKAGING`
- `READY`
- `PUBLISHED`
- `FAILED`

### 2) Endpoint init upload

`POST /creator/media-assets/init-upload`

Rôle: `CREATOR` ou `ADMIN`.

Entrée:

- `contentId`
- `filename`
- `contentType`
- optionnel: `checksum`, `sizeBytes`

Traitement:

- vérifie le contenu
- crée `VideoAsset` en `CREATED`
- génère URL presignée MinIO (`video/raw/{contentId}/...`)

Sortie:

- métadonnées asset
- `putUrl`, `bucket`, `key`, `publicUrl`

### 3) Endpoint mark uploaded

`POST /creator/media-assets/:id/mark-uploaded`

Rôle: `CREATOR` ou `ADMIN`.

Traitement:

- met l'asset en `UPLOADED`
- met à jour checksum/taille si fournis
- enqueue le job `video.probe`

Sortie:

- asset mis à jour
- état de la queue (`bullmq` ou `db-stub`)

### 4) Queue `video.probe` + worker réel `ffprobe`

Services:

- `MediaJobsService` (enqueue)
- `MediaProbeWorker` (consommateur BullMQ)

- crée une ligne `VideoJob` (`type=probe`, `status=queued`)
- si `REDIS_URL` présent: enqueue BullMQ (`video-pipeline`, job `video.probe`)
- `MediaProbeWorker` consomme le job, télécharge la source depuis MinIO et lance `ffprobe`
- persiste les métadonnées (`durationSec`, `width`, `height`, `frameRate`)
- met à jour le statut job (`running/succeeded/failed`) et asset (`UPLOADED/FAILED`)
- enchaîne automatiquement un job `video.transcode` en cas de succès
- si `REDIS_URL` absent: fallback `db-stub` (enqueue logique uniquement)

## Modules ajoutés

- `MediaAssetsModule`
  - controller + service API ingest
- `MediaJobsModule`
  - enqueue queue/stub

Intégrés à `AppModule`.

## Endpoints disponibles

- `POST /creator/media-assets/init-upload`
- `POST /creator/media-assets/:id/mark-uploaded`
- `GET /creator/media-assets/:id`

## Variables d'environnement utiles

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_PUBLIC_BASE_URL` (optionnel)
- `REDIS_URL` (optionnel mais recommandé pour BullMQ)
- `MEDIA_JOBS_ENABLE_WORKER` (optionnel, `true` par défaut)

## Prérequis runtime

- `ffprobe` doit être installé et accessible dans le `PATH` du process API.

## Transcode HLS (ajouté)

Worker: `MediaTranscodeWorker`

- consomme `video.transcode`
- met l'asset en `TRANSCODING`
- télécharge la source depuis MinIO
- lance FFmpeg pour générer HLS multi-profils:
  - 360p (v0)
  - 480p (v1)
  - 720p (v2)
- génère `master.m3u8` + playlists variantes + segments `.ts`
- upload vers MinIO sous `video/hls/{assetId}/...`
- persiste les renditions dans `video_renditions`
- met l'asset en `READY` avec `manifestPath=video/hls/{assetId}/master.m3u8`

En cas d'échec: `FAILED` + `errorCode=TRANSCODE_FAILED`.

### Poster (vignette)

Pendant `video.transcode`, avant le HLS :

- extraction d’une frame JPEG (ffmpeg) depuis la source ;
- upload MinIO `video/posters/{assetId}.jpg` ;
- champ `VideoAsset.posterObjectKey` ;
- si `MINIO_PUBLIC_BASE_URL` est défini : mise à jour `Content.thumbnailUrl` ou `Episode.thumbnailUrl`.

Si la vignette échoue, le transcode HLS **continue** (log warning).

### Probe → catalogue

Après `ffprobe`, la durée détectée est recopiée sur `Content.duration` (film) ou `Episode.duration` (épisode).

### Publication modération → assets

Lors de l’approbation admin d’un contenu, les `VideoAsset` en `READY` concernés passent en **`PUBLISHED`** (film : `episodeId` null ; série : uniquement les épisodes effectivement publiables).

### Supervision admin (API)

- `GET /admin/video-pipeline/assets?page=&limit=&status=` — liste assets + derniers jobs ;
- `POST /admin/video-pipeline/assets/:assetId/retry-probe` — relance réservée aux assets **`FAILED`** (reset métadonnées / renditions, nouveau job probe).

Le dashboard `GET /admin/dashboard` inclut `videoPipeline.assetsFailed` et `videoPipeline.assetsInProgress`.

## Prochaines étapes recommandées (Phase 2+)

1. Nettoyage MinIO des préfixes `video/hls/` / `video/posters/` orphelins lors d’un retry ou delete asset.
2. Lecture HLS : reverse proxy ou CDN + politique CORS si bucket privé (segments signés ou bucket public sur préfixes dérivés).
3. DRM / packaging avancé (Widevine, etc.) si besoin métier.
4. Worker dédié `video.thumbnail` (storyboards) optionnel.

## Extension épisodes (Phase 3 en cours)

- `VideoAsset` supporte désormais `episodeId` (optionnel) pour lier un master source à un épisode.
- `POST /creator/media-assets/init-upload` accepte `contentId` ou `episodeId`.
- Si `episodeId` est utilisé, le contenu parent doit être de type `SERIES` ou `WEB_SERIES` (même workflow).
- Dans IVOD, `SERIES` et `WEB_SERIES` suivent le même workflow d'épisodes (upload, pipeline, playback).
- Pour un `episodeId`, le pipeline stocke la source sous `video/raw/episodes/{episodeId}/...`.
- Playback épisode: priorité aux assets MinIO `READY` (manifest HLS), fallback Mux si aucun asset prêt.

