# IVOD Series/VOD Service Roadmap (End-to-End)

Ce document décrit la cible complète du service VOD/Séries avec MinIO, Mux, droits, monétisation et opérations.

## 1. Vision globale

Le service doit couvrir 3 couches:

- Editorial: contenus parent (film/série) + épisodes avec métadonnées riches.
- Media pipeline: upload, probe, transcode HLS, packaging, playback signé, monitoring jobs.
- Business: droits, entitlement, modération, revenus/statements.

## 2. Architecture cible

### 2.1 Entités

- Content (parent): identité éditoriale globale.
- Episode (enfant): saison, numéro, titre, description, thumbnail, durée, statut, vidéo.
- VideoAsset/VideoRendition/VideoJob: pipeline technique.
- RightsContract/ContentRight/RevenueRule/RevenueStatement: gouvernance business.

### 2.2 Providers vidéo

- Mux: ingestion rapide et DRM, fallback de lecture.
- MinIO + workers FFmpeg: pipeline propriétaire HLS (maîtrise coût/infra).
- Stratégie recommandée: dual-path avec priorité MinIO READY, fallback Mux.

## 3. Flux fonctionnels

### 3.1 Créateur - Film

1. Créer metadata film.
2. Uploader vidéo source (progression).
3. Pipeline passe par UPLOADING -> PROCESSING -> READY/PUBLISHED.
4. Admin valide si workflow modération actif.

### 3.2 Créateur - Série

1. Créer parent série (sans vidéo principale).
2. Ajouter épisodes (titre, description, saison, numéro, thumbnail, vidéo).
3. Upload épisode unitaire ou batch.
4. Pipeline et statut par épisode.
5. Publication épisode indépendante (avec garde-fous parent).

### 3.3 Viewer

1. Vérification entitlement (plan + droits + territoire + statut).
2. Lecture URL signée HLS.
3. Tracking progress par épisode.
4. Reprise lecture et analytics.

## 4. Roadmap par phases

## Phase 1 (implémentée dans cette passe)

- Enrichissement épisode avec description.
- UI créateur: saisie description épisode + upload progression épisode.
- Typage API renforcé sur create/update episode.
- Documentation produit/tech de la cible.

## Phase 2 (haute priorité)

- Migration DB + déploiement schema episode.description.
- Ecran dédié "Détail série / Gestion épisodes" avec:
  - édition/suppression épisode,
  - tri S/E robuste,
  - statut pipeline visible,
  - progression upload par ligne.
- Validation forte unicité (contentId, season, episode) côté API + UX.
- Retry upload et annulation upload.

## Phase 3 (MinIO unifié contenus + épisodes)

- Étendre VideoAsset pour supporter les épisodes (episodeId nullable + contraintes).
- Init-upload/mark-uploaded pour épisode.
- Chaînage probe/transcode/package pour épisodes.
- Playback signé MinIO pour épisode (même logique que contenu parent).
- Backfill des contenus/épisodes Mux vers MinIO selon stratégie.

## Phase 4 (exploitation/fiabilité)

- Dashboard pipeline (jobs, erreurs, retries).
- Alerting (taux échec, durée encodage, saturation workers).
- SLA ingestion->ready.
- Audit log modération, publication, modifications droits.

## 5. Points d'attention

- Les migrations Prisma doivent être versionnées et exécutées par environnement.
- Les workers FFmpeg exigent des ressources CPU/RAM dédiées.
- Entitlement doit rester centralisé pour éviter les bypass.
- Les revenus par épisode nécessitent une granularité data cohérente (watch history + plans + règles).
