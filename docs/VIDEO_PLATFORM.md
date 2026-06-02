# Plateforme vidéo iVOD — vision long terme (parité Mux)

Objectif : **solution maison durable** (ingest → encode → package → delivery → analytics) sans dépendre de Mux, avec la même qualité de service perçue.

## État actuel (fondations)

| Couche | Implémentation |
|--------|----------------|
| Ingest | Presigned PUT MinIO + **upload multipart** (gros fichiers) |
| Transcode | BullMQ + ffmpeg, ladder adaptatif 240p–2160p, preview 720p puis ladder complet |
| Encodage CPU | Single-pass `filter_complex` (un décodage, N profils) + repli séquentiel |
| Package | HLS VOD MPEG-TS, master `#EXTM3U` v3 + **#EXT-X-MEDIA sous-titres** |
| Playback | JWT court (15 min par défaut) + proxy API / **CDN** (`VIDEO_CDN_BASE_URL`) |
| Preview | `READY_PREVIEW`, Socket.io + webhooks HTTP |
| Posters | 5 vignettes JPEG + poster principal |
| Storyboard | Sprite + WebVTT (seek preview) |
| Notifications | In-app + email échec + webhooks signés |
| Ops admin | Timeline `VideoJob`, retry pipeline, alertes file |
| QoE | Événements lecteur → `playback_qoe_events` + dashboard créateur |

## Architecture cible

```
[Client / Studio]
      │ presigned PUT / multipart
      ▼
[MinIO ivod-videos] ──► [BullMQ video-pipeline]
                              │
                    probe → preview transcode → package
                              → full transcode → package
                              → thumbnails + storyboard
                              ▼
                    [HLS master + renditions + posters]
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [Webhooks]          [Socket.io]         [CDN edge]
         │                    │                    │
         ▼                    ▼                    ▼
   Intégrations         Studio / Admin        Lecteurs
```

## Phases roadmap

### Phase 1 — Fiabilité & parité fonctionnelle VOD

- [x] Ladder prod = dev (pas d’allowlist implicite)
- [x] Verrous BullMQ longues tâches
- [x] Single-pass transcode CPU
- [x] Webhooks `video.asset.*` (HMAC)
- [x] Storyboard sprite + VTT
- [x] Streaming segments (Range HTTP)
- [x] Épisodes : assets `READY` / `READY_PREVIEW` lisibles
- [x] Reprise upload multipart (`POST /videos/multipart/*`)
- [x] Admin : timeline jobs + retry + santé file

### Phase 2 — Delivery & sécurité playback

- [x] CDN devant API (`VIDEO_CDN_BASE_URL` — nginx proxy vers `/videos/*/media`)
- [x] Token playback court (`VIDEO_PLAYBACK_TOKEN_TTL_SEC`, défaut 900 s)
- [x] Cache segments `immutable` + playlists courtes
- [x] Option **fMP4 / CMAF** (meilleur LL-HLS, préparation DRM) via `VIDEO_HLS_SEGMENT_TYPE=fmp4`

### Phase 3 — Sous-titres & audio

- [x] API upload VTT/SRT (`/videos/subtitles/*`)
- [x] Normalisation ffmpeg SRT→VTT automatique (fallback: SRT conservé si conversion impossible)
- [x] `#EXT-X-MEDIA` dans master HLS
- [ ] Pistes audio multiples dans le ladder (préparation master `#EXT-X-MEDIA TYPE=AUDIO`)

### Phase 4 — Data & ops (Mux Data-like)

- [x] Événements lecteur → `POST /watch-sessions/qoe`
- [x] Table `playback_qoe_events`
- [x] Agrégats QoE dans `GET /creators/me/analytics`
- [x] Alertes pipeline (`GET /admin/video-pipeline/health`)

### Phase 5 — Live & DRM (optionnel)

- [x] RTMP ingest configurable (`LIVE_RTMP_URL`)
- [ ] DVR / replay HLS live
- [ ] DRM AES-128 ou Widevine (CMAF requis)

## Variables d’environnement

| Variable | Rôle |
|----------|------|
| `VIDEO_TWO_PHASE` | Preview 720p avant ladder complet |
| `VIDEO_SINGLE_PASS_LADDER` | Un ffmpeg / N profils (CPU) |
| `VIDEO_JOB_LOCK_MS` | Verrou BullMQ transcode long |
| `VIDEO_WEBHOOK_URLS` | URLs POST séparées par virgule |
| `VIDEO_WEBHOOK_SECRET` | HMAC SHA-256 du body |
| `VIDEO_CDN_BASE_URL` | Préfixe public (proxy segments) |
| `VIDEO_PLAYBACK_TOKEN_TTL_SEC` | Durée JWT lecture (défaut 900) |
| `VIDEO_HLS_SEGMENT_TYPE` | `ts` (défaut) ou `fmp4` (CMAF) |
| `LIVE_RTMP_URL` | URL ingest RTMP (Oven/nginx-rtmp) |
| `LIVE_HLS_PLAYBACK_URL` | URL lecture HLS live (optionnel) |
| `VIDEO_FAST_MODE` | Tests rapides |
| `VIDEO_DEV_PROFILES` | Allowlist manuelle profils |

## Endpoints clés

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/video-pipeline/health` | Santé file + alertes |
| GET | `/admin/video-assets/:id/jobs` | Timeline jobs |
| POST | `/admin/video-assets/:id/retry-pipeline` | Relancer probe / package |
| POST | `/videos/multipart/init` | Init upload multipart |
| POST | `/watch-sessions/qoe` | Événement QoE lecteur |
| POST | `/videos/subtitles/upload-url` | Presigned sous-titre |

## Webhooks

Événements : `video.asset.preview_ready` | `ready` | `failed`  
Header : `X-IVOD-Signature: sha256=<hmac>`

## Fichiers clés

- `apps/api/src/modules/videos/video-pipeline.processor.ts`
- `apps/api/src/modules/videos/video-hls-manifest.ts`
- `apps/api/src/modules/videos/video-playback-delivery.ts`
- `apps/api/src/modules/videos/video-subtitles.service.ts`
- `apps/api/src/modules/watch-sessions/playback-qoe.service.ts`
