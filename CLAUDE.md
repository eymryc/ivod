# CLAUDE.md — iVOD Platform

Guide de référence pour une IA assistant au développement de ce projet.
Lire ce fichier en entier avant d'écrire du code.

---

## 1. Vue d'ensemble

**iVOD** est une plateforme de streaming VOD (Video on Demand) africaine ciblant l'Afrique de l'Ouest (marché FCFA/XOF).

### Architecture globale

```
IVOD/                        ← Monorepo racine (Turborepo + npm workspaces)
├── apps/
│   ├── api/                 ← Backend NestJS (port 3000)
│   ├── web/                 ← Frontend Next.js App Router (port 3001)
│   └── mobile/              ← Application Expo / React Native
├── packages/
│   ├── types/               ← Types TypeScript partagés (@ivod/types)
│   └── config/              ← Config ESLint/Prettier partagée
└── docker-compose.yml       ← PostgreSQL 15, Redis 7, MinIO
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS 10, TypeScript, Prisma 5, PostgreSQL 15 |
| Frontend web | Next.js (App Router), React 19, TailwindCSS |
| Mobile | Expo + React Native (Expo Router) |
| Stockage vidéo | MinIO (S3-compatible, self-hosted) ou Mux (SaaS) |
| Transcodage | ffmpeg/ffprobe via workers BullMQ (Redis) |
| Paiement | Stripe, CinetPay (mobile money Afrique) |
| Auth | JWT (7 jours), OTP email, bcryptjs |
| Emails | SMTP via MailService |
| Push notifs | OneSignal |
| Queue | BullMQ (Redis 7) |
| RBAC | Roles + Permissions en base (tables `roles`, `permissions`, `user_roles`, `user_permissions`) |
| Types partagés | `@ivod/types` (ESM) |

---

## 2. Architecture backend (NestJS)

### 2.1 Bootstrap (`apps/api/src/main.ts`)

- Préfixe global : **`/api/v1`**
- Swagger disponible sur `/api/v1/docs`
- CORS : `localhost:3001` + `FRONTEND_URL` (env)
- `rawBody: true` activé (webhooks Stripe)
- `ValidationPipe` global : `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `TransformInterceptor` global : enveloppe toutes les réponses dans `ApiResponse<T>`
- `GlobalExceptionFilter` global : normalise toutes les erreurs dans `ApiResponse<null>`
- `MustChangePasswordInterceptor` : bloque les requêtes si `mustChangePassword = true` (sauf GET /users/me et POST /auth/change-password et POST /auth/setup-password)
- Rate limit global : 20 requêtes / 60 secondes (ThrottlerModule)

### 2.2 Modules applicatifs

```
src/modules/
├── auth/                  ← OTP, JWT, login/register password, reset, setup invite
├── users/                 ← Profil, préférences, watch history
├── contents/              ← Catalogue VOD, épisodes, progression lecture
├── creators/              ← Profils créateurs / uploaders
├── admin/                 ← Back-office, KPIs, modération, gestion utilisateurs
├── subscriptions/         ← Abonnements, cron de renouvellement
├── videos/                ← Flux HLS, proxy MinIO, téléchargements
├── uploads/               ← Presigned PUT URL vers MinIO
├── media-jobs/            ← Workers BullMQ (probe + transcode ffmpeg → HLS)
├── media-assets/          ← CRUD VideoAsset / VideoRendition / VideoJob
├── notifications/         ← Notifications in-app + WebSocket gateway
├── favorites/             ← Favoris utilisateur
├── follows/               ← Suivi créateurs
├── categories/            ← Référentiel catégories éditoriales
├── references/            ← Référentiels (rôles, plans, statuts, types…)
├── rights/                ← Contrats de droits, ContentRight
├── rightsholders/         ← Ayants droit (producteurs, distributeurs, réalisateurs)
├── revenue-sharing/       ← Règles de partage des revenus, RevenueStatement
└── mail/                  ← Service SMTP (OTP, bienvenue, reset, invite)
```

### 2.3 Format de réponse API (IMMUABLE)

Toutes les réponses suivent `ApiResponse<T>` défini dans `@ivod/types` :

```typescript
// Succès
{
  success: true,
  data: T | null,
  error: null,
  meta: { timestamp: string, version: "v1", ...pagination? }
}

// Erreur
{
  success: false,
  data: null,
  error: { code: string, message: string, field?: string, details?: unknown },
  meta: { timestamp: string, version: "v1" }
}
```

**Règles absolues :**
- Ne jamais retourner `res.json()` directement — laisser le `TransformInterceptor` envelopper.
- Toujours lancer des exceptions NestJS (`BadRequestException`, `NotFoundException`, etc.) avec un objet `{ code: string, message: string }` pour obtenir des codes d'erreur normalisés.
- Le champ `message` dans la réponse de succès POST/PUT/PATCH est automatiquement injecté par l'intercepteur si absent.

### 2.4 Codes d'erreur AUTH

| Code | Signification |
|------|---------------|
| AUTH_001 | Token invalide / session invalide |
| AUTH_002 | Identifiants invalides |
| AUTH_003 | OTP invalide ou expiré |
| AUTH_004 | Trop de tentatives OTP |
| AUTH_006 | Compte désactivé |
| AUTH_007 | Email déjà utilisé |
| AUTH_008 | Téléphone déjà utilisé |
| AUTH_010 | Token reset password invalide ou expiré |
| AUTH_011 | Trop de tentatives reset |
| AUTH_012 | mustChangePassword bloqué |
| AUTH_013 | Compte sans mot de passe |
| AUTH_014 | Lien invitation invalide/expiré |
| AUTH_015 | Mot de passe non défini (compte admin) |
| AUTH_016 | Jeton invitation manquant |
| RBAC_001 | Rôle référentiel manquant (seeds non exécutés) |
| VALIDATION_ERROR | Erreur DTO class-validator |
| FORBIDDEN | Accès refusé (rôle/permission insuffisant) |

---

## 3. Authentification et RBAC

### 3.1 Flux d'authentification

**Deux modes coexistent :**

1. **OTP email** (mode principal) :
   - `POST /api/v1/auth/send-otp` → envoie un code 5 chiffres valable 10 min
   - `POST /api/v1/auth/verify-otp` → vérifie + crée le user si nouveau + retourne JWT
   - Inscription explicite : `POST /api/v1/auth/register/send-otp` + `POST /api/v1/auth/register/verify-otp`

2. **Mot de passe** (admin / invités) :
   - `POST /api/v1/auth/register` → inscription classique
   - `POST /api/v1/auth/login` → connexion email ou phone
   - `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password`
   - `POST /api/v1/auth/setup-password` → invitation admin (token SHA-256 en base)
   - `POST /api/v1/auth/change-password` → changement mot de passe connecté

### 3.2 JWT Payload

```typescript
{
  sub: string,          // userId (CUID)
  email: string,
  role: string,         // rôle principal (legacy + RBAC)
  plan: string,         // FREE | PREMIUM | PREMIUM_PLUS
  permissions: string[], // codes de permissions RBAC
  mustChangePassword: boolean
}
```

La stratégie JWT (`JwtStrategy.validate()`) **relit la base** à chaque requête pour construire `roles[]` et `permissions[]` à jour.

### 3.3 Guards et décorateurs

```typescript
// Protéger un endpoint (JWT requis)
@UseGuards(JwtAuthGuard)

// JWT optionnel (enrichit req.user si token présent, continue sinon)
@UseGuards(OptionalJwtAuthGuard)

// Restreindre par rôle
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')

// Restreindre par permission fine
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('content:publish', 'content:delete')

// Récupérer l'utilisateur courant dans un handler
@CurrentUser() user: User
@CurrentUser('id') userId: string
```

**Note :** `PermissionsGuard` accepte `'*'` comme permission superadmin qui bypasse tous les checks.

### 3.4 RBAC — Modèle de données

- **Un user a au plus un rôle actif** (table `user_roles` avec `userId` en PK).
- Les permissions sont héritées du rôle + des permissions directes (`user_permissions`).
- Les rôles et permissions sont des **référentiels en base** (table `roles` et `permissions`) — exécuter les seeds RBAC avant tout test.
- Rôles système : `VIEWER`, `CREATOR`, `ADMIN` (+ potentiellement d'autres en base).

---

## 4. Modèle de données (Prisma)

### 4.1 Entités principales

| Modèle | Table | Description |
|--------|-------|-------------|
| `User` | `users` | Compte utilisateur (email unique, phone unique) |
| `Creator` | `creators` | Profil créateur/uploader (1-1 avec User) |
| `Content` | `contents` | Film/série/contenu VOD |
| `Episode` | `episodes` | Épisode d'une série |
| `Season` | `seasons` | Saison d'une série |
| `VideoAsset` | `video_assets` | Asset vidéo MinIO + état pipeline |
| `VideoRendition` | `video_renditions` | Rendu HLS (480p, 720p, 1080p…) |
| `VideoJob` | `video_jobs` | Job de traitement (probe, transcode) |
| `Subscription` | `subscriptions` | Abonnement actif d'un user |
| `Payment` | `payments` | Transaction de paiement |
| `WatchHistory` | `watch_history` | Progression de lecture |
| `Download` | `downloads` | Téléchargements hors-ligne |
| `Favorite` | `favorites` | Favoris (unique userId+contentId) |
| `Follow` | `follows` | Suivi créateur (unique followerId+creatorId) |
| `Notification` | `notifications` | Notification in-app |
| `Rightsholder` | `rightsholders` | Ayant droit légal |
| `RightsContract` | `rights_contracts` | Contrat de droits |
| `ContentRight` | `content_rights` | Droits par contenu/territoire/monétisation |
| `RevenueRule` | `revenue_rules` | Règle de partage revenus |
| `RevenueStatement` | `revenue_statements` | Statement financier périodique |

### 4.2 Référentiels (tables `ref_*`)

Les statuts/types/plans sont en **base de données**, pas en enums hardcodés :

| Modèle | Table | Contenu |
|--------|-------|---------|
| `UserRoleRef` | `ref_user_roles` | VIEWER, CREATOR, ADMIN |
| `UserPlanRef` | `ref_user_plans` | FREE, PREMIUM, PREMIUM_PLUS |
| `ContentTypeRef` | `ref_content_types` | SINGLE, SERIES, WEB_SERIES (+ `typeCode` applicatif) |
| `ContentStatusRef` | `ref_content_statuses` | UPLOADING, PROCESSING, PUBLISHED, REJECTED, ARCHIVED |
| `ContentVisibilityRef` | `ref_content_visibilities` | PUBLIC, PREMIUM_ONLY, PPV, PRIVATE |
| `SubscriptionStatusRef` | `ref_subscription_statuses` | ACTIVE, CANCELLED, EXPIRED, PENDING |
| `PaymentProviderRef` | `ref_payment_providers` | CINETPAY, STRIPE, WAVE, ORANGE_MONEY, MTN_MOMO |
| `PaymentStatusRef` | `ref_payment_statuses` | PENDING, SUCCEEDED, FAILED, REFUNDED |

> **Règle :** Pour filtrer par statut/type, utiliser `{ status: { code: 'PUBLISHED' } }` (relation imbriquée) et NON `{ statusCode: 'PUBLISHED' }`.

### 4.3 IDs

Tous les IDs sont des **CUID** (`@id @default(cuid())`), jamais des UUIDs ou auto-incréments.

### 4.4 Devises et montants

- Montants en **FCFA entiers** (Int en base, pas Float) pour XOF.
- Champ `currency` par défaut `"XOF"` sauf Stripe qui utilise des centimes.
- `totalEarned` du `Creator` est en FCFA.

### 4.5 Enum natif Prisma (seuls deux restants)

```prisma
enum RightsholderType { PRODUCER | PRODUCTION_COMPANY | DISTRIBUTOR | DIRECTOR }
enum VideoAssetStatus { CREATED | UPLOADED | PROBING | TRANSCODING | PACKAGING | READY | PUBLISHED | FAILED }
```

Tous les autres anciens enums ont été convertis en tables référentielles.

---

## 5. Pipeline vidéo

### 5.1 Flux complet

```
1. Client → POST /api/v1/uploads/presign    (obtenir PUT URL MinIO)
2. Client → PUT <MinIO URL>                 (upload du fichier source)
3. Client → POST /api/v1/media-assets/trigger/{contentId}  (déclencher le pipeline)
4. Worker probe  → ffprobe → résolution/durée/codec → VideoAsset mis à jour
5. Worker transcode → ffmpeg → HLS multi-bitrate → renditions dans MinIO
6. VideoAsset.status → READY / PUBLISHED
7. Client → GET /api/v1/videos/hls-proxy/{assetId}/master.m3u8  (lecture HLS)
```

### 5.2 États VideoAsset

`CREATED → UPLOADED → PROBING → TRANSCODING → PACKAGING → READY → PUBLISHED`
(+ `FAILED` depuis n'importe quel état)

### 5.3 Providers vidéo

Contrôlé par `VIDEO_UPLOAD_PROVIDER` dans l'env :
- `"minio"` (défaut) : upload direct MinIO + transcodage interne BullMQ/ffmpeg
- `"mux"` : upload Mux SaaS (legacy, les champs `muxUploadId`, `muxAssetId`, `muxPlaybackId` sur `Content` et `Episode` en témoignent)

---

## 6. Conventions de code NestJS

### 6.1 Structure d'un module

```
modules/exemple/
├── exemple.module.ts       ← @Module(...)
├── exemple.controller.ts   ← @Controller('exemples') + routes + guards + DTOs
├── exemple.service.ts      ← logique métier + appels Prisma
└── dto/
    └── exemple.dto.ts      ← class-validator + class-transformer + @ApiProperty
```

### 6.2 Template contrôleur

```typescript
@ApiTags('ExempleTag')
@Controller('exemples')
export class ExempleController {
  constructor(private readonly exempleService: ExempleService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async findAll(@CurrentUser('id') userId: string) {
    return this.exempleService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.exempleService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateExempleDto, @CurrentUser('id') userId: string) {
    return this.exempleService.create(dto, userId);
  }
}
```

### 6.3 DTOs (class-validator)

```typescript
import { IsString, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExempleDto {
  @ApiProperty({ example: 'titre du contenu' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1500 })
  @IsInt()
  @Min(0)
  price: number;
}
```

**Règles DTOs :**
- Toujours annoter avec `@ApiProperty` / `@ApiPropertyOptional` pour Swagger.
- Utiliser `@IsOptional()` avant le validateur sur les champs optionnels.
- `transform: true` et `enableImplicitConversion: true` sont actifs globalement — les types primitifs sont convertis automatiquement depuis les query params.

### 6.4 Service — accès Prisma

```typescript
@Injectable()
export class ExempleService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const item = await this.prisma.exemple.findUnique({ where: { id } });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ressource introuvable' });
    return item;
  }
}
```

**Règles services :**
- Toujours `PrismaService` via injection (jamais instancié directement).
- Lancer des exceptions NestJS avec `{ code, message }` — jamais de `res.status()` dans les services.
- Utiliser `this.prisma.$transaction([...])` pour les opérations multi-tables atomiques.
- Ne jamais exposer le `passwordHash` dans les retours — l'exclure explicitement avec `select`.

### 6.5 Pagination

```typescript
// Helper partagé
import { paginate } from '../../common/helpers/paginate.helper';

const [items, total] = await this.prisma.$transaction([
  this.prisma.content.findMany({ skip: (page - 1) * limit, take: limit, where }),
  this.prisma.content.count({ where }),
]);
return paginate(items, total, page, limit);
```

Retourne `PaginatedResponse<T>` avec `{ items, meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage } }`.

---

## 7. Flux métier clés

### 7.1 Inscription utilisateur (OTP)

1. `POST /auth/register/send-otp` — vérifie email non existant, génère OTP 5 chiffres, stocke dans OtpStore (Redis ou mémoire)
2. `POST /auth/register/verify-otp` — vérifie OTP, crée User (role: VIEWER), attache rôle RBAC, envoie email bienvenue, retourne JWT
3. JWT contient `{ sub, email, role, plan, permissions[], mustChangePassword }`

### 7.2 Création utilisateur par admin

1. Admin `POST /admin/users` — crée user avec `mustChangePassword: true` + `passwordSetupTokenSha256`
2. Email invitation envoyé avec lien contenant le token brut
3. User `POST /auth/setup-password` — token SHA-256 vérifié en base, mot de passe défini, `mustChangePassword → false`
4. `MustChangePasswordInterceptor` bloque toutes les autres routes entre temps

### 7.3 Upload contenu vidéo

1. Créateur `POST /uploads/presign` → obtient URL PUT MinIO + `objectKey`
2. Navigateur PUT direct sur MinIO (sans passer par l'API)
3. Créateur `POST /media-assets/trigger/:contentId` avec `sourceObjectKey`
4. `VideoAsset` créé en CREATED → job BullMQ probe enqueued
5. Worker probe: ffprobe → `VideoAsset` → PROBING → UPLOADED (durée, résolution)
6. Worker transcode: ffmpeg HLS → renditions MinIO → `VideoAsset` → READY
7. Notification envoyée au créateur

### 7.4 Lecture HLS

- Mode proxy (défaut) : `GET /api/v1/videos/hls-proxy/:assetId/master.m3u8` — token `pt` requis (signé JWT)
- L'intercepteur `TransformInterceptor` est bypassé pour les routes `/videos/hls-proxy/` (réponse HLS brute)

### 7.5 Abonnements

- Plans : FREE (gratuit, pub), PREMIUM, PREMIUM_PLUS
- Providers : Stripe (international), CinetPay / Wave / Orange Money / MTN MoMo (Afrique)
- `SubscriptionCron` vérifie les expirations périodiquement
- `Subscription.currentPeriodEnd` détermine l'accès Premium

### 7.6 Droits et revenus

- **Rightsholder** = ayant droit légal (producteur, distributeur, réalisateur)
- **ContentRight** = droit par contenu, territoire (`CI | UEMOA | AFRICA | WORLD | DIASPORA`), et type de monétisation (`SVOD | TVOD | AVOD`)
- **RevenueRule** = règle de partage (creator 60%, platform 40% par défaut)
- **RevenueStatement** = état financier calculé par période (`DRAFT → LOCKED → PAID`)

---

## 8. Frontend Web (Next.js)

### 8.1 Structure des routes (App Router)

```
app/
├── (home)/              ← Pages publiques/marketing (layout commun)
│   ├── page.tsx         ← Landing page
│   ├── login/           ← Connexion
│   ├── register/        ← Inscription
│   ├── films/           ← Catalogue public
│   ├── series/
│   ├── prix/            ← Pricing
│   └── …
├── (app)/               ← App authentifiée (viewer)
│   ├── dashboard/
│   ├── content/[id]/
│   ├── ma-liste/
│   └── recherche/
├── viewer/              ← Espace viewer connecté
│   ├── accueil/
│   ├── films/
│   ├── profil/
│   └── notifications/
├── creator/             ← Espace créateur
│   ├── dashboard/
│   ├── contenus/[contentId]/episodes/
│   └── revenus/
├── admin/               ← Back-office admin
│   ├── dashboard/
│   ├── utilisateurs/
│   ├── contenus/
│   ├── creators/
│   ├── abonnements/
│   ├── paiements/
│   ├── rightsholders/
│   ├── rights-contracts/
│   ├── content-rights/
│   ├── revenue-rules/
│   ├── revenue-statements/
│   ├── video-pipeline/
│   └── referentiels/ (+ sous-pages par référentiel)
└── components/          ← Composants partagés
```

### 8.2 Composants clés

- `AdminDataTable` / `AdminEndpointListCard` / `ReferenceCrudTable` — composants admin génériques pour CRUD de référentiels
- `WorkspaceShell` / `UnifiedSidebar` — shell app connectée
- `ContentCard` / `HorizontalRail` — catalogue viewer
- `FormModal` / `Dialog` — modales génériques

---

## 9. Infrastructure

### 9.1 Variables d'environnement requises (API)

```bash
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # ≥ 32 chars
VIDEO_UPLOAD_PROVIDER # "minio" | "mux"

# MinIO (si minio)
MINIO_ENDPOINT        # ex: http://localhost:9000
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET          # ex: ivod
MINIO_PUBLIC_BASE_URL # URL publique pour les images

# Mux (si mux ou hybride)
MUX_TOKEN_ID / MUX_TOKEN_SECRET / MUX_WEBHOOK_SECRET / MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY

# Stripe
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PREMIUM / STRIPE_PRICE_PREMIUM_PLUS

# CinetPay
CINETPAY_API_KEY / CINETPAY_SITE_ID

# Redis
REDIS_URL             # ex: redis://localhost:6379
# OU Upstash (prod)
UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  # OTP store

# SMTP
MAIL_HOST / MAIL_PORT / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM_ADDRESS

# App
FRONTEND_URL          # ex: http://localhost:3001
API_PUBLIC_URL        # ex: http://localhost:3000
NODE_ENV              # development | production
PORT                  # défaut: 3000
HLS_PLAYBACK_MODE     # "proxy" | "presign"
TRANSCODE_LADDER_PRESET # "mobile" | "balanced" | "tv"
```

### 9.2 Docker Compose

- `postgres:15` sur port 5432
- `redis:7` sur port 6379 (avec mot de passe optionnel via `REDIS_PASSWORD`)
- `minio/minio` sur ports 9000 (API S3) et 9001 (console)
- `minio_init` : crée le bucket et le rend public en download

### 9.3 Commandes utiles

```bash
# Démarrage dev
npm run dev                         # Tous les apps (Turborepo)

# API seule
cd apps/api && npm run start:dev

# Migrations Prisma
npx prisma migrate dev --name nom_migration
npx prisma generate
npx prisma db seed                  # Seeds référentiels

# Workers BullMQ (transcodage)
# Démarrés automatiquement avec l'API en mode NestJS
```

---

## 10. Règles et conventions impératives

### 10.1 Toujours faire

- **Utiliser `@ivod/types`** pour les types partagés entre frontend et backend.
- **Exceptions avec code** : `throw new NotFoundException({ code: 'NOT_FOUND', message: '...' })`.
- **Swagger systématique** : `@ApiTags`, `@ApiBearerAuth('BearerAuth')`, `@ApiProperty` sur tous les DTOs.
- **Sélectionner explicitement** les champs Prisma sensibles (`passwordHash`, `passwordSetupTokenSha256`) pour les exclure des retours.
- **Injecter `ConfigService`** pour lire les variables d'environnement (jamais `process.env` directement dans les services).
- **Logger NestJS** : `private logger = new Logger('NomDuService')` — utiliser `this.logger.error/warn/log`.
- **Montants en FCFA entiers** (Int) pour les paiements XOF.
- **CUID** pour les IDs (`cuid()` via Prisma) — ne pas générer manuellement.

### 10.2 Ne jamais faire

- Ne pas retourner `passwordHash` ou `passwordSetupTokenSha256` dans aucune réponse API.
- Ne pas créer d'enums Prisma pour les référentiels — les ajouter en table `ref_*`.
- Ne pas utiliser `process.env` directement dans les services NestJS.
- Ne pas écrire de logique métier dans les contrôleurs (déplacer dans le service).
- Ne pas bypass le `TransformInterceptor` (sauf routes HLS proxy explicitement exemptées).
- Ne pas utiliser `BigInt` sans le passer par `toString()` (géré dans le `TransformInterceptor`).
- Ne pas oublier `@UseGuards(JwtAuthGuard)` sur les endpoints privés.
- Ne jamais hardcoder des clés API, secrets ou URLs dans le code source.

### 10.3 Patterns à respecter

**Filtre par statut via relation :**
```typescript
// CORRECT
await this.prisma.content.findMany({ where: { status: { code: 'PUBLISHED' } } })

// INCORRECT (statusCode n'existe pas)
await this.prisma.content.findMany({ where: { statusCode: 'PUBLISHED' } })
```

**Pagination standardisée :**
```typescript
// Toujours utiliser paginate() de common/helpers/paginate.helper.ts
return paginate(items, total, page, limit);
```

**Guard sur le controller ou handler (pas les deux) :**
```typescript
// Préférer au niveau handler pour flexibilité
@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async findOne() { ... }
```

**BigInt dans les entités Prisma :**
```typescript
// VideoAsset.sourceSizeBytes est BigInt → le TransformInterceptor le convertit
// Si manipulation explicite : Number(asset.sourceSizeBytes) ou asset.sourceSizeBytes.toString()
```

---

## 11. Types partagés (`@ivod/types`)

```typescript
// Rôles et plans
type UserRole = 'VIEWER' | 'CREATOR' | 'ADMIN';
type UserPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

// Contenu
type ContentCategory = 'HUMOUR' | 'SERIE' | 'FILM' | 'DOCUMENTAIRE' | 'LIVE' | 'CLIP';
type ContentType = 'SINGLE' | 'SERIES';
type ContentStatus = 'UPLOADING' | 'PROCESSING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type ContentVisibility = 'PUBLIC' | 'PREMIUM_ONLY' | 'PPV' | 'PRIVATE';

// Paiement
type PaymentProvider = 'CINETPAY' | 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO';
type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';

// Réponse API
interface ApiResponse<T = null> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}
```

---

## 12. Points d'attention spécifiques

1. **OTP store** : en mémoire en développement, en Redis (Upstash REST) en production. Le service `OtpStoreService` abstrait les deux.

2. **HLS proxy** : le backend proxifie les segments HLS depuis MinIO pour éviter d'exposer les URLs MinIO directement. La route `/videos/hls-proxy/` est exemptée du `TransformInterceptor`.

3. **MustChangePasswordInterceptor** : enregistré comme intercepteur global au niveau `APP_INTERCEPTOR`. Il bloque AVANT la logique du contrôleur.

4. **Creator vs Rightsholder** : `Creator` = entité opérationnelle (uploader de contenu sur la plateforme). `Rightsholder` = entité légale externe (ayant droit, producteur, distributeur). Un creator n'est PAS automatiquement un rightsholder.

5. **`RefDataGuardService`** : service singleton (provider racine) pour valider que les références (IDs des tables `ref_*`) existent en base avant de les utiliser dans les DTOs.

6. **Throttling global** : 20 req/60s par IP. Pour les routes auth (envoi OTP), ce rate limit s'applique — pas de rate limit dédié supplémentaire.

7. **Webhooks** : `rawBody: true` activé sur NestFactory pour valider les signatures Stripe/Mux.

8. **Namespace packages** : `@ivod/types`, `@ivod/config` — utiliser ces imports dans toute la codebase (jamais de chemins relatifs vers les packages depuis les apps).
