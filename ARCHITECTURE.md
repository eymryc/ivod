# IVOD Platform — Architecture & Refonte Complète

> Plateforme VOD africaine — NestJS + Prisma + PostgreSQL + MinIO + BullMQ  
> Marché cible : Afrique francophone / XOF (FCFA)  
> Date de rédaction : 2026-05-09

---

## 1. ACTEURS DU SYSTÈME

| Acteur | Rôle | Accès |
|---|---|---|
| **Viewer** | Consomme les contenus | SVOD / TVOD / AVOD |
| **Creator / Studio** | Upload et gère ses contenus | Dashboard studio |
| **Rightsholder** | Détient les droits légaux | Gestion contrats & revenus |
| **Distributor** | Gère la distribution territoriale | Droits territoriaux |
| **Admin** | Gère la plateforme | Back-office complet |
| **Moderator** | Valide et modère les contenus | File de modération |
| **Finance** | Audit paiements & royalties | Reporting financier |
| **Analytics** | Analyse les performances | Tableaux de bord |

---

## 2. DÉCISIONS ARCHITECTURALES CLÉS

### 2.1 Ce qu'on GARDE de l'existant
- Pipeline vidéo : `VideoAsset → VideoRendition → VideoJob` (MinIO, HLS, encodage) — solide — voir **`docs/VIDEO_PLATFORM.md`** (roadmap long terme type Mux)
- Gestion des droits : `Rightsholder → RightsContract → ContentRight` (SVOD/TVOD/AVOD, territorial) — très bien pensé
- Revenue sharing : `RevenueRule → RevenueStatement` (XOF natif) — à conserver
- Auth & RBAC : `Role → Permission → RolePermission → UserRole` — complet
- WebSocket notifications — ok

### 2.2 Ce qu'on SUPPRIME / REFACTORISE
- `User.role` (String) et `User.plan` (String) → redondants avec RBAC → supprimer ces champs flat
- Champs `muxUploadId/AssetId/PlaybackId` sur `Content` et `Episode` → déplacés dans `VideoAsset` uniquement
- `ContentRating` (up/down String) → remplacé par `ContentLike` + `ContentReview` (séparés)
- `WatchHistory` lié à `User` → migré vers `Profile`
- `Favorite` lié à `User` → migré vers `Profile`

### 2.3 Ce qu'on AJOUTE (manquant critique)
- **Multi-profils** (Profile par compte) → WatchHistory, Favorites, Likes, Comments par profil
- **Genres many-to-many** → un contenu peut avoir plusieurs genres
- **Cast & Crew** → acteurs et équipe technique
- **Comments & Reviews** → engagement utilisateur
- **Watch sessions** → reprise de lecture précise, par device
- **Geo restrictions** → blocage par pays
- **Devices & Login history** → sécurité anti-partage de compte
- **Contrôle parental** → profil enfant
- **Transactions / Invoices / Refunds** → audit financier complet
- **Content stats** → analytics, tendances
- **Banners / Campaigns** → marketing éditorial
- **Media assets** → thumbnails, posters, trailers séparés des vidéos
- **Subtitle & Audio tracks** → multilingue
- **Awards** → palmarès cinéma africain
- **Countries & Languages** → tables référence propres
- **Currencies** → XOF principal + USD/EUR diaspora

---

## 3. SCHEMA DE BASE DE DONNÉES COMPLET

### 3.1 MODULE RÉFÉRENTIELS (tables de données stables)

```
ref_languages          → code ISO (fr, en, wo, bm...), label
ref_countries          → code ISO, label, région Afrique/Europe/etc.
ref_currencies         → XOF, USD, EUR, GBP + symbol, décimales
ref_genres             → ACTION, DRAMA, COMEDIE, DOCUMENTAIRE, ANIMATION...
ref_content_types      → FILM, SERIE, WEB_SERIE, DOCUMENTAIRE, LIVE
ref_content_statuses   → DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED, ARCHIVED
ref_content_visibilities → PUBLIC, SUBSCRIBERS_ONLY, PPV, PRIVATE
ref_maturity_ratings   → TOUS_PUBLICS, -12, -16, -18
ref_user_roles         → VIEWER, CREATOR, ADMIN, MODERATOR, FINANCE, DISTRIBUTOR
ref_user_plans         → FREE, BASIC, PREMIUM (avec maxScreens, videoQuality, hasAds, prix XOF)
ref_subscription_statuses → ACTIVE, EXPIRED, CANCELLED, PAUSED
ref_payment_providers  → ORANGE_MONEY, WAVE, MTN_MONEY, MOOV_MONEY, STRIPE, PAYPAL
ref_payment_statuses   → PENDING, COMPLETED, FAILED, REFUNDED
ref_rightsholder_types → PRODUCER, PRODUCTION_COMPANY, DISTRIBUTOR, DIRECTOR, CO_PRODUCER
ref_monetization_types → SVOD, TVOD, AVOD, FREE
ref_territory_codes    → CI, SN, ML, BF, TG, BJ, GN, NE, CM, UEMOA, AFRICA, WORLD, DIASPORA
ref_crew_roles         → DIRECTOR, SCREENWRITER, PRODUCER, EDITOR, COMPOSER, CINEMATOGRAPHER
ref_award_types        → FESPACO, CLAP_IVOIRE, OSCARS, CANNES, CESAR
```

### 3.2 MODULE UTILISATEURS & PROFILS

```
users
  id, email, phone, passwordHash
  firstName, lastName, name, avatarUrl
  isActive, mustChangePassword
  passwordSetupTokenSha256, passwordSetupExpiresAt
  createdAt, updatedAt

profiles                    ← NOUVEAU — multi-profils par compte
  id, userId FK
  name, avatarUrl
  isKids                    ← profil enfant (déclenche contrôle parental)
  languageCode FK → ref_languages
  maturityRating FK → ref_maturity_ratings
  isDefault
  pin                       ← code PIN optionnel pour accéder au profil
  createdAt, updatedAt

user_roles                  → userId (PK), roleId FK
user_permissions            → userId, permissionId (PK composite)
roles                       → id, code (UNIQUE), label
permissions                 → id, code (UNIQUE), label
role_permissions            → roleId, permissionId (PK composite)

user_subscriptions          ← renommé depuis "subscriptions"
  id, userId FK
  planId FK → ref_user_plans
  statusId FK → ref_subscription_statuses
  providerId FK → ref_payment_providers
  currentPeriodStart, currentPeriodEnd
  cancelAtPeriodEnd
  externalId                ← référence paiement externe
  createdAt, updatedAt

devices                     ← NOUVEAU
  id, userId FK
  deviceType                ← MOBILE, TABLET, TV, WEB, DESKTOP
  deviceName, os, osVersion
  appVersion
  fingerprint               ← identifiant unique device
  createdAt, lastSeenAt

device_tokens               ← NOUVEAU — push notifications
  id, deviceId FK
  token                     ← FCM / APNs token
  platform                  ← ANDROID, IOS, WEB
  updatedAt

login_history               ← NOUVEAU
  id, userId FK
  ipAddress, userAgent
  deviceId FK (nullable)
  countryCode, cityName
  success
  createdAt

device_sessions             ← NOUVEAU — limiter partage de compte
  id, userId FK, deviceId FK
  token                     ← session token
  isActive
  lastActivityAt
  createdAt, expiresAt

parental_controls           ← NOUVEAU
  id, profileId FK (1-1)
  maxMaturityRating
  blockedGenres             ← JSON array de genre codes
  restrictedHoursStart      ← ex: 22 (22h)
  restrictedHoursEnd        ← ex: 6
  requirePin                ← demander PIN pour contenu -12 etc.
```

### 3.3 MODULE CONTENU

```
contents
  id
  creatorId FK → creators
  uploadedByUserId FK → users
  primaryRightsholderId FK → rightsholders
  distributorId FK → rightsholders (nullable)
  title, slug (UNIQUE), description
  shortDescription          ← synopsis court (pour cards)
  contentTypeId FK → ref_content_types
  statusId FK → ref_content_statuses
  visibilityId FK → ref_content_visibilities
  maturityRatingId FK → ref_maturity_ratings
  countryOfOriginId FK → ref_countries  ← NOUVEAU
  originalLanguageId FK → ref_languages ← NOUVEAU
  releaseYear
  duration                  ← secondes (nullable pour séries)
  isExclusive
  ppvPrice                  ← en FCFA (nullable, TVOD uniquement)
  trailerUrl                ← URL trailer (nullable)
  tags                      ← String[]
  releaseDate               ← date de sortie initiale
  publishedAt               ← date de mise en ligne sur plateforme
  rejectionReason
  viewCount                 ← dénormalisé, mis à jour par job
  likeCount                 ← dénormalisé
  averageRating             ← dénormalisé (0.0-5.0)
  createdAt, updatedAt

  → SUPPRIMÉ : muxUploadId, muxAssetId, muxPlaybackId (déplacés dans VideoAsset)
  → SUPPRIMÉ : thumbnailUrl (géré par media_assets)

content_genres              ← NOUVEAU — many-to-many
  contentId FK → contents
  genreId FK → ref_genres
  (PK composite)

genres                      ← alias ref_genres (voir référentiels)

seasons
  id, contentId FK
  number, title, description
  posterObjectKey           ← image saison dans MinIO
  releaseYear
  createdAt, updatedAt
  UNIQUE(contentId, number)

episodes
  id, contentId FK, seasonId FK (nullable)
  episodeNumber, seasonNumber
  title, description
  thumbnailObjectKey        ← dans MinIO
  duration                  ← secondes
  statusId FK → ref_content_statuses
  viewCount
  publishedAt, rejectionReason
  createdAt, updatedAt
  UNIQUE(contentId, seasonNumber, episodeNumber)

media_assets                ← NOUVEAU — images, posters, trailers
  id, contentId FK
  episodeId FK (nullable)
  type                      ← THUMBNAIL, POSTER, BANNER, TRAILER, CLIP
  objectKey                 ← chemin MinIO
  mimeType, sizeBytes
  width, height
  languageId FK (nullable) ← poster localisé
  isPrimary                 ← asset principal de ce type
  createdAt

subtitle_tracks             ← NOUVEAU
  id, contentId FK
  episodeId FK (nullable)
  languageId FK → ref_languages
  objectKey                 ← fichier .vtt dans MinIO
  isDefault, isForced
  format                    ← VTT, SRT
  createdAt

audio_tracks                ← NOUVEAU
  id, contentId FK
  episodeId FK (nullable)
  languageId FK → ref_languages
  objectKey                 ← piste audio dans MinIO (nullable si intégrée)
  format                    ← AAC, AC3, DOLBY_ATMOS
  isDefault
  label                     ← ex: "Français (Audiodescription)"
  createdAt
```

### 3.4 MODULE CAST & CREW

```
people                      ← NOUVEAU — acteurs + équipe (table unifiée)
  id
  fullName, stageName
  avatarObjectKey           ← photo dans MinIO
  biography
  birthDate, birthCountryId FK → ref_countries
  nationality
  websiteUrl, imdbId
  createdAt, updatedAt

content_cast                ← NOUVEAU
  id, contentId FK, personId FK
  characterName
  displayOrder              ← ordre d'affichage au générique
  isMainCast                ← rôle principal ou second rôle
  episodeId FK (nullable)  ← pour apparitions spécifiques

content_crew                ← NOUVEAU
  id, contentId FK, personId FK
  crewRoleId FK → ref_crew_roles
  episodeId FK (nullable)
```

### 3.5 MODULE PRODUCTION & DROITS

```
creators
  id, userId FK (UNIQUE)
  stageName, bio
  avatarObjectKey, bannerObjectKey
  verified, verifiedAt
  subscriberCount           ← dénormalisé
  totalEarned               ← FCFA, dénormalisé
  createdAt, updatedAt

rightsholders
  id
  type FK → ref_rightsholder_types
  displayName, legalName
  email, phone
  countryId FK → ref_countries
  logoObjectKey
  isVerified
  createdAt, updatedAt

rights_contracts
  id, rightsholderId FK, distributorId FK (nullable)
  contractRef (UNIQUE)
  signedAt, startsAt, endsAt
  isExclusive, notes
  revenueSharePct           ← % pour ce contrat
  createdAt, updatedAt

content_rights
  id, contentId FK, contractId FK
  monetizationTypeId FK → ref_monetization_types
  territoryCodeId FK → ref_territory_codes
  startsAt, endsAt
  status                    ← ACTIVE, EXPIRED, SUSPENDED
  createdAt, updatedAt
  INDEX(contentId, territoryCodeId, monetizationTypeId, status)

geo_restrictions            ← NOUVEAU — liste blanche/noire par pays
  id, contentId FK
  countryId FK → ref_countries
  mode                      ← ALLOW ou BLOCK
  reason
  createdAt

revenue_rules
  id, code (UNIQUE), name
  appliesToType             ← PLATFORM_DEFAULT | CONTRACT | CONTENT
  appliesToId (nullable)
  creatorSharePct, platformSharePct, partnerSharePct
  isActive
  effectiveFrom, effectiveTo
  createdAt, updatedAt

revenue_statements
  id
  periodStart, periodEnd
  beneficiaryType           ← RIGHTSHOLDER | CREATOR | PARTNER
  beneficiaryId
  rightsholderId FK (nullable)
  contentId FK (nullable)
  ruleId FK
  grossAmount, feesAmount, taxesAmount
  netDistributable
  beneficiaryAmount, platformAmount, partnerAmount
  currency                  ← XOF par défaut
  status                    ← DRAFT | LOCKED | PAID
  paidAt
  createdAt, updatedAt
```

### 3.6 MODULE VIDÉO & PIPELINE

```
video_assets
  id, contentId FK, episodeId FK (nullable)
  sourceObjectKey           ← fichier source dans MinIO
  sourceChecksum, sourceMimeType, sourceSizeBytes
  status                    ← CREATED | UPLOADED | PROBING | TRANSCODING | PACKAGING | READY | PUBLISHED | FAILED
  errorCode, errorMessage
  profileVersion
  manifestPath              ← chemin manifest HLS dans MinIO
  durationSec, width, height, frameRate
  posterObjectKey           ← miniature générée
  
  muxUploadId               ← nullable, si Mux utilisé en fallback
  muxAssetId, muxPlaybackId ← nullable
  
  createdAt, updatedAt
  INDEX(contentId, status), INDEX(episodeId, status)

video_renditions
  id, assetId FK
  name                      ← "1080p", "720p", "480p", "360p"
  width, height
  videoBitrate, audioBitrate
  playlistPath              ← chemin .m3u8 dans MinIO
  codecs                    ← "avc1.64001f,mp4a.40.2"
  createdAt

video_jobs
  id, assetId FK
  type                      ← PROBE | TRANSCODE | PACKAGE | THUMBNAIL | PUBLISH
  status                    ← PENDING | RUNNING | DONE | FAILED
  attempts, maxAttempts
  lastError
  payload                   ← JSON (paramètres du job)
  startedAt, finishedAt
  createdAt
  INDEX(assetId, type)
```

### 3.7 MODULE EXPÉRIENCE UTILISATEUR

```
watch_history               ← lié au PROFIL (pas user)
  id, profileId FK, contentId FK, episodeId FK (nullable)
  watchedSeconds, percentage
  completed
  lastWatchedAt
  createdAt, updatedAt
  UNIQUE(profileId, contentId, episodeId)

watch_sessions              ← NOUVEAU — session active en cours
  id, profileId FK, contentId FK, episodeId FK (nullable)
  deviceId FK
  currentPositionSec        ← position en secondes
  qualitySelected           ← "1080p", "auto"...
  isActive
  startedAt, endedAt, lastHeartbeatAt
  INDEX(profileId, isActive)

favorites                   ← lié au PROFIL
  id, profileId FK, contentId FK
  createdAt
  UNIQUE(profileId, contentId)

follows                     ← user suit un creator
  id, followerId FK → users, creatorId FK → creators
  createdAt
  UNIQUE(followerId, creatorId)

content_likes               ← NOUVEAU — remplace ContentRating
  id, profileId FK, contentId FK
  createdAt
  UNIQUE(profileId, contentId)

comments                    ← NOUVEAU
  id, profileId FK, contentId FK
  parentId FK (nullable)    ← réponse à un commentaire
  body
  isModerated, moderatedAt, moderatedByUserId FK
  isDeleted
  createdAt, updatedAt

content_reviews             ← NOUVEAU — notes (1-5 étoiles)
  id, profileId FK, contentId FK
  rating                    ← 1 à 5
  title, body
  isVerifiedPurchase
  createdAt, updatedAt
  UNIQUE(profileId, contentId)

content_reports             ← NOUVEAU — signalements
  id, profileId FK, contentId FK
  reason                    ← INAPPROPRIATE, SPAM, COPYRIGHT, OTHER
  description
  status                    ← PENDING, REVIEWED, DISMISSED, ACTIONED
  reviewedByUserId FK (nullable)
  createdAt, updatedAt

downloads                   ← lié au USER (pas profil — lié à l'abonnement)
  id, userId FK, contentId FK, episodeId FK (nullable)
  assetId FK → video_assets
  quality
  fileSizeMb
  objectKey                 ← fichier dans MinIO
  expiresAt
  createdAt
```

### 3.8 MODULE NOTIFICATIONS

```
notifications
  id, userId FK
  type                      ← VIDEO_READY | PAYMENT_CONFIRMED | NEW_CONTENT | SUB_EXPIRING | NEW_FOLLOWER | COMMENT_REPLY
  title, body
  data                      ← JSON (contentId, etc.)
  read, readAt
  createdAt

  INDEX(userId, read)
```

### 3.9 MODULE PAIEMENT & FINANCE

```
payments
  id, userId FK, userSubscriptionId FK (nullable)
  contentId FK (nullable)   ← pour TVOD / PPV
  amount                    ← en FCFA
  currency
  statusId FK → ref_payment_statuses
  providerId FK → ref_payment_providers
  transactionId (UNIQUE)    ← référence fournisseur (Orange Money ref, etc.)
  phoneNumber               ← numéro Mobile Money
  metadata                  ← JSON
  paidAt
  createdAt, updatedAt

transactions                ← NOUVEAU — audit détaillé
  id, paymentId FK
  reference (UNIQUE)        ← référence interne
  type                      ← DEBIT | CREDIT | REFUND | CHARGEBACK
  amount, currency
  status
  gatewayResponse           ← JSON réponse brute du fournisseur
  createdAt

invoices                    ← NOUVEAU
  id, userId FK, paymentId FK (nullable)
  invoiceNumber (UNIQUE)
  issueDate, dueDate
  subtotal, taxes, total
  currency
  status                    ← DRAFT | ISSUED | PAID | VOID
  pdfObjectKey              ← PDF généré dans MinIO
  createdAt

refunds                     ← NOUVEAU
  id, paymentId FK, requestedByUserId FK
  amount, currency
  reason
  status                    ← REQUESTED | APPROVED | PROCESSED | REJECTED
  processedAt
  gatewayRefundId
  createdAt, updatedAt

exchange_rates              ← NOUVEAU
  id, fromCurrencyId FK, toCurrencyId FK
  rate
  fetchedAt
  INDEX(fromCurrencyId, toCurrencyId)

taxes                       ← NOUVEAU
  id, countryId FK
  name                      ← "TVA", "TPS"
  percentage
  appliesToPlans            ← Boolean
  appliestoTVOD             ← Boolean
  isActive
  effectiveFrom, effectiveTo
```

### 3.10 MODULE ANALYTICS & STATS

```
content_views               ← événement de visionnage (append-only)
  id, profileId FK, contentId FK, episodeId FK (nullable)
  deviceId FK (nullable)
  watchTimeSeconds
  completionPct
  countryCode
  createdAt
  INDEX(contentId, createdAt), INDEX(profileId, createdAt)

content_stats               ← NOUVEAU — aggrégats précalculés (mis à jour par cron)
  contentId FK (PK)
  totalViews, uniqueViewers
  totalWatchTimeSeconds
  averageWatchTimeSeconds
  completionRate            ← % des viewers qui finissent le contenu
  likeCount, favoriteCount
  commentCount, reviewCount
  averageRating
  popularityScore           ← score calculé (vues + engagement + tendance)
  updatedAt

user_behavior               ← NOUVEAU — tracking comportemental (light)
  id, profileId FK
  action                    ← PLAY | PAUSE | SEEK | STOP | SEARCH | CLICK_CONTENT | SKIP_INTRO | SKIP_CREDITS
  contentId FK (nullable)
  episodeId FK (nullable)
  metadata                  ← JSON { position, query, ... }
  deviceId FK (nullable)
  createdAt
  INDEX(profileId, createdAt)

search_history              ← NOUVEAU
  id, profileId FK
  query
  resultsCount
  clickedContentId FK (nullable)
  createdAt

trending_searches           ← NOUVEAU — mis à jour par job
  id, query
  searchCount               ← sur les 24h glissantes
  period                    ← "1h" | "24h" | "7d"
  updatedAt

recommendations             ← NOUVEAU — suggestions personnalisées
  id, profileId FK, contentId FK
  score                     ← 0.0 à 1.0
  reason                    ← BECAUSE_YOU_WATCHED | POPULAR_IN_YOUR_COUNTRY | NEW_FROM_CREATOR | etc.
  algorithm                 ← nom/version algo utilisé
  expiresAt
  createdAt
  INDEX(profileId, score DESC)
```

### 3.11 MODULE ÉDITORIAL & MARKETING

```
banners                     ← NOUVEAU — homepage / promotions
  id
  title, subtitle
  contentId FK (nullable)
  imageObjectKey
  linkUrl (nullable)        ← lien externe ou interne
  position                  ← ordre d'affichage
  targetPlanIds             ← JSON (nullable, ciblage par plan)
  countryIds                ← JSON (nullable, ciblage par pays)
  isActive
  startsAt, endsAt
  createdAt, updatedAt

campaigns                   ← NOUVEAU — campagnes marketing
  id, name, description
  type                      ← PROMO_CODE | EMAIL | PUSH | IN_APP_BANNER
  startsAt, endsAt
  isActive
  metadata                  ← JSON (config selon type)
  createdAt, updatedAt

awards                      ← NOUVEAU — palmarès
  id
  name                      ← "FESPACO", "Clap Ivoire", "OSCARS"
  category                  ← "Meilleur Film", "Meilleur Réalisateur"
  year
  countryId FK (nullable)
  createdAt

content_awards              ← NOUVEAU — liaison contenu ↔ récompense
  contentId FK, awardId FK
  won                       ← true = gagné, false = nommé
  (PK composite)

content_status_history      ← NOUVEAU — audit workflow éditorial
  id, contentId FK
  oldStatus, newStatus
  changedByUserId FK
  comment
  createdAt

moderation_queue            ← NOUVEAU — file de validation
  id, contentId FK
  priority                  ← NORMAL | HIGH | URGENT
  assignedToUserId FK (nullable)
  notes
  status                    ← PENDING | IN_REVIEW | DONE
  createdAt, updatedAt
```

### 3.12 MODULE SÉCURITÉ

```
security_logs               ← NOUVEAU — événements de sécurité
  id, userId FK (nullable)
  action                    ← PASSWORD_CHANGE | FAILED_LOGIN | ACCOUNT_LOCKED | SUSPICIOUS_ACCESS | MFA_ENABLED
  ipAddress, userAgent
  deviceId FK (nullable)
  metadata                  ← JSON
  createdAt
  INDEX(userId, createdAt)
```

### 3.13 MODULE LIVE STREAMING (Phase 2)

```
live_streams
  id, creatorId FK
  title, description
  streamKey (UNIQUE)        ← clé RTMP
  playbackUrl               ← URL HLS live
  status                    ← SCHEDULED | LIVE | ENDED
  viewerCount               ← temps réel
  scheduledStartAt, startedAt, endedAt
  thumbnailObjectKey
  createdAt, updatedAt

live_events
  id, liveStreamId FK
  type                      ← CONCERT | MATCH | CONFERENCE | PREMIERE | OTHER
  ticketPriceFcfa (nullable) ← PPV Live
  maxViewers (nullable)
  createdAt
```

---

## 4. MODULES API NESTJS

### Structure des modules

```
apps/api/src/modules/
│
├── auth/                   ← JWT, OAuth2, OTP, refresh tokens
├── users/                  ← CRUD utilisateurs
├── profiles/               ← NOUVEAU — multi-profils
├── creators/               ← comptes créateurs / studios
├── admin/                  ← back-office administration
│
├── contents/               ← CRUD contenus (films, séries)
├── episodes/               ← épisodes
├── seasons/                ← saisons
├── genres/                 ← référentiel genres
├── people/                 ← NOUVEAU — acteurs & crew
├── media-assets/           ← NOUVEAU — images, posters, trailers
├── video-assets/           ← pipeline vidéo (upload, encodage)
│
├── rightsholders/          ← détenteurs de droits
├── rights/                 ← contrats & droits territoriaux
├── geo-restrictions/       ← NOUVEAU
│
├── subscriptions/          ← abonnements utilisateurs
├── payments/               ← paiements Mobile Money / carte
├── invoices/               ← NOUVEAU — facturation
├── refunds/                ← NOUVEAU — remboursements
├── revenue/                ← règles & statements (partage revenus)
│
├── watch/                  ← NOUVEAU — watch-history + watch-sessions
├── favorites/              ← liste de favoris par profil
├── follows/                ← abonnements créateurs
├── likes/                  ← NOUVEAU
├── comments/               ← NOUVEAU
├── reviews/                ← NOUVEAU
├── downloads/              ← téléchargements offline
├── reports/                ← NOUVEAU — signalements
│
├── search/                 ← NOUVEAU — moteur de recherche
├── recommendations/        ← NOUVEAU — suggestions personnalisées
├── analytics/              ← NOUVEAU — stats contenus, comportement
│
├── notifications/          ← WebSocket + push mobile
├── devices/                ← NOUVEAU — gestion appareils
│
├── banners/                ← NOUVEAU — promotions homepage
├── campaigns/              ← NOUVEAU — marketing
├── awards/                 ← NOUVEAU — palmarès
├── moderation/             ← NOUVEAU — file de validation
│
├── live/                   ← NOUVEAU — live streaming (phase 2)
│
├── references/             ← toutes les tables ref_*
├── health/                 ← healthcheck
├── mail/                   ← emails transactionnels
└── prisma/                 ← service Prisma
```

---

## 5. ORGANISATION DES PHASES

### Phase 1 — Core (MVP stable)
Priorité : faire fonctionner le service de streaming de base.

**Base de données**
- [ ] Schéma Prisma complet (tous les modèles de ce document)
- [ ] Migrations
- [ ] Seeds (référentiels : langues, pays, genres, plans, providers)

**Modules prioritaires**
- [ ] `auth` — JWT + OTP email/SMS + refresh token
- [ ] `users` — CRUD + RBAC
- [ ] `profiles` — multi-profils par compte
- [ ] `contents` — CRUD avec genres many-to-many
- [ ] `video-assets` — pipeline MinIO upload → encodage HLS → publication
- [ ] `watch` — watch-history + watch-sessions (reprendre lecture)
- [ ] `subscriptions` — SVOD avec Orange Money / Wave
- [ ] `payments` — intégration Mobile Money
- [ ] `notifications` — WebSocket + email
- [ ] `favorites` — par profil
- [ ] `search` — full-text PostgreSQL (pg_trgm) sur titre, description, tags

### Phase 2 — Engagement & Business
- [ ] `people` — acteurs & crew (cast/crew sur les contenus)
- [ ] `comments` & `reviews` & `likes`
- [ ] `reports` — modération
- [ ] `moderation` — file de validation éditorial
- [ ] `rightsholders` & `rights` & `geo-restrictions`
- [ ] `revenue` — rules & statements (royalties)
- [ ] `invoices` & `refunds`
- [ ] `devices` & login history & sécurité
- [ ] `parental-controls` — profils enfants
- [ ] `banners` & `campaigns` — marketing éditorial
- [ ] `awards`

### Phase 3 — Analytics & IA
- [ ] `analytics` — content_stats, user_behavior, trending
- [ ] `recommendations` — algo de suggestion (filtrage collaboratif)
- [ ] `search` — intégration Meilisearch ou ElasticSearch
- [ ] AVOD — intégration publicités
- [ ] `live` — live streaming RTMP/HLS

---

## 6. RÈGLES MÉTIER IMPORTANTES

### Accès au contenu
```
AVOD    → FREE (avec pub) + BASIC + PREMIUM
SVOD    → BASIC + PREMIUM uniquement
TVOD    → achat unitaire, tous plans
PPV     → Live event, accès payant
```

### Résolution de géo-restriction
```
1. Vérifier content_rights (territoryCode de l'utilisateur)
2. Vérifier geo_restrictions (ALLOW/BLOCK par pays)
3. Si aucune règle → contenu non disponible par défaut
```

### Pipeline vidéo (MinIO)
```
Upload source → VideoAsset(CREATED)
→ Job PROBE → VideoAsset(PROBING) → extraction metadata
→ Job TRANSCODE → VideoAsset(TRANSCODING) → 360p/480p/720p/1080p
→ Job PACKAGE → VideoAsset(PACKAGING) → manifest HLS
→ Job THUMBNAIL → génération poster
→ VideoAsset(READY) → notification créateur
→ Validation admin → VideoAsset(PUBLISHED) → visible
```

### Partage des revenus (XOF)
```
Règle platform default : creatorShare=70%, platformShare=30%
→ Calcul mensuel sur grossAmount(vues × tarif plan)
→ RevenueStatement DRAFT → validation Finance → LOCKED → paiement → PAID
```

### Profils & contrôle parental
```
- 1 User → max 5 profils
- Profil isKids=true → maturityRating forcé à TOUS_PUBLICS
- parental_controls.restrictedHoursStart/End → bloquer accès aux heures définies
- PIN requis pour passer à un profil adulte depuis un profil enfant
```

### Limite d'appareils (anti-partage)
```
FREE    → 1 écran simultané
BASIC   → 2 écrans simultanés
PREMIUM → 4 écrans simultanés
→ Vérifier device_sessions actives à chaque PLAY
→ device_sessions.lastHeartbeatAt mis à jour toutes les 30s
```

---

## 7. STACK TECHNIQUE

| Couche | Choix | Raison |
|---|---|---|
| Runtime | Node.js 20 LTS | Stabilité + NestJS |
| Framework | NestJS 10 | Monorepo, guards, pipes, WebSocket |
| ORM | Prisma 5 | Typage fort, migrations, relations |
| BDD | PostgreSQL 16 | pg_trgm (search), JSON, partitions |
| Stockage fichiers | MinIO (S3-compatible) | Self-hosted, XOF economics |
| Queue jobs | BullMQ + Redis | Encodage vidéo asynchrone |
| WebSocket | Socket.io (via NestJS) | Notifications temps réel |
| Auth | JWT (access 15min) + Refresh (30j) | Sécurité standard |
| Email | SMTP / Resend | OTP, notifications |
| Search (Phase 3) | Meilisearch | Recherche multilingue (fr/en/langues locales) |
| Monitoring | Pino (logs) + Prometheus | Observabilité |
| Conteneurisation | Docker + docker-compose | Dev/prod cohérents |

---

## 8. CONVENTIONS DE CODE

### Nommage
- Tables Prisma : PascalCase (`Content`, `WatchHistory`)
- Maps SQL : snake_case (`contents`, `watch_history`)
- IDs : `cuid()` (pas d'UUID ni bigint auto-increment)
- Dates : toujours `DateTime` Prisma (UTC stocké, converti à l'affichage)
- Montants : toujours en `Int` (centimes ou FCFA entiers, jamais Float)

### Modules NestJS
- Un module = un dossier avec `module.ts`, `controller.ts`, `service.ts`, `dto/`
- DTOs : class-validator + class-transformer
- Guards : `JwtAuthGuard` global + `RolesGuard` / `PermissionsGuard` par route
- Interceptors : `TransformInterceptor` (response unifiée), `MustChangePasswordInterceptor`

### Réponses API
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

---

## 9. VARIABLES D'ENVIRONNEMENT REQUISES

```env
# Base de données
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# MinIO
MINIO_ENDPOINT=
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_VIDEOS=ivod-videos
MINIO_BUCKET_ASSETS=ivod-assets

# Redis / BullMQ
REDIS_URL=redis://...

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=noreply@ivod.africa

# Mobile Money (à configurer selon opérateurs)
ORANGE_MONEY_API_URL=
ORANGE_MONEY_API_KEY=
WAVE_API_URL=
WAVE_API_KEY=

# Notifications push
FCM_SERVER_KEY=
APNS_KEY_ID=
APNS_TEAM_ID=

# App
APP_URL=https://ivod.africa
API_URL=https://api.ivod.africa
PORT=3000
NODE_ENV=production
```

---

## 10. VIDÉOS PROMOTIONNELLES (Teaser / BA / Extras)

Modèle hybride (Prime Video + extensible) — **sans droit sur l’œuvre complète**.

| Type `MediaAsset` | Rôle | Variante (`promoVariant`) |
|---|---|---|
| `TEASER` | Annonce courte, souvent avant publication | — |
| `TRAILER` | Bande-annonce | `STANDARD`, `THEATRICAL`, `FINAL` |
| `CLIP` | Extrait / scène | — |
| `MAKING_OF` | Coulisses | — |

Champs : `durationSec`, `label`, `sortOrder`, `isPrimary`, `languageCode`.

**Lecture publique** : `GET /api/v1/media-assets/:id/promo-stream` (URL signée MinIO, bucket `ivod-videos` ou `ivod-assets`).  
**Bundle fiche titre** : `promoVideos` sur `GET /contents/:id` et `GET /contents/:id/promo` (`@ivod/types` → `PromoVideosBundle`).  
Règle UX : contenu non `PUBLISHED` → priorité au teaser ; publié → teaser + BA principale + extras.

**Clients** : `PromoVideoBar` (hero), `PromoExtrasSection` (liste), `PromoPlayerModal` (stream API).  
**Studio** : `PromoMediaStudioSection` — presign → PUT → register, principale par type, suppression.

---

## 11. CHECKLIST DE DÉMARRAGE

### Schéma & BDD
- [ ] Écrire `prisma/schema.prisma` complet selon ce document
- [ ] `npx prisma migrate dev --name init`
- [ ] Écrire seeds pour tous les référentiels
- [ ] Ajouter indexes manquants (perf)

### API
- [ ] Générer tous les modules NestJS (Phase 1 en priorité)
- [ ] Configurer guards globaux (JWT + MustChangePassword)
- [ ] Swagger complet avec `@ApiTags` et `@ApiResponse`
- [ ] Tests e2e sur les routes critiques (auth, play, payment)

### Infrastructure
- [ ] `docker-compose.dev.yml` (PostgreSQL, MinIO, Redis)
- [ ] `Dockerfile` API multi-stage
- [ ] `Makefile` avec commandes standards (`make dev`, `make migrate`, `make seed`)
- [ ] Variables d'environnement documentées dans `.env.example`
