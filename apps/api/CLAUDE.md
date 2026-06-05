@AGENTS.md

# iVOD API — Guide NestJS pour Claude

> NestJS 10 + Prisma 5 + BullMQ + MinIO + Redis + Docker
> Base URL : `http://localhost:3000/api/v1`
> Swagger : `http://localhost:3000/api/v1/docs`

---

## ARCHITECTURE & MODES

L'API tourne en **deux modes Docker** (variable `IVOD_APP_MODE`) :
- `api` → `src/main.ts` + `AppModule` — répond aux requêtes HTTP
- `worker` → `src/worker-main.ts` + `WorkerAppModule` — traitement BullMQ (transcodage vidéo)

```
src/
├── app.module.ts           # Module racine — importe tous les sous-modules
├── main.ts                 # Bootstrap HTTP (Swagger, CORS, Helmet, Pipes, Guards)
├── worker-main.ts          # Bootstrap worker (BullMQ uniquement)
├── prisma/                 # PrismaModule (global), seed.ts
├── common/
│   ├── constants/          # Plans, types, rôles (chaînes constantes)
│   ├── decorators/         # @Roles(), @CurrentUser(), @Public()
│   ├── filters/            # GlobalExceptionFilter (normalise les erreurs)
│   ├── guards/             # RolesGuard, AppThrottlerGuard, PermissionsGuard
│   ├── helpers/            # paginate(), slugify(), dto-transform...
│   ├── interceptors/       # TransformInterceptor (enveloppe toutes les réponses)
│   ├── logger/             # Winston logger
│   ├── promo-media/        # Résolution des assets promotionnels
│   ├── services/           # MinioService, RedisService, QueueService
│   └── types/              # ApiResponse<T>, PaginatedResponse<T>
└── modules/                # 40+ modules NestJS (un dossier par domaine)
```

---

## PATTERN D'UN MODULE NESTJS

Chaque module suit strictement cette structure :

```
modules/<nom>/
├── <nom>.module.ts      # @Module({ imports, providers, controllers, exports })
├── <nom>.controller.ts  # Routes HTTP + DTOs + guards + Swagger decorators
├── <nom>.service.ts     # Logique métier + accès Prisma
└── dto/                 # DTOs de validation (class-validator + class-transformer)
    └── <nom>.dto.ts
```

### Template controller
```typescript
@ApiTags('NomModule')
@Controller('route')
export class NomController {
  constructor(private readonly service: NomService) {}

  @Get()
  @ApiOperation({ summary: 'Description courte' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  list(@Query('page') page = 1) {
    return this.service.list(page);
  }

  @Post()
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBody({ type: CreateDto })
  create(@Body() dto: CreateDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }
}
```

### Template service
```typescript
@Injectable()
export class NomService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page: number) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.model.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.model.count(),
    ]);
    return paginate(items, total, page, limit);
  }
}
```

---

## GUARDS ET AUTHENTIFICATION

### Pattern d'usage standard
```typescript
// Route publique
@Get('public')
public() { ... }

// Route authentifiée (tout utilisateur connecté)
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
me(@CurrentUser() user: JwtPayload) { ... }

// Route admin uniquement
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('BearerAuth')
create() { ... }

// Route créateur ou admin
@Patch(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR', 'ADMIN')
update() { ... }
```

### Décorateur `@CurrentUser()`
Retourne le payload JWT : `{ sub: string, email: string, roles: string[] }`.

### Guard optionnel (token si présent, sinon public)
```typescript
@UseGuards(OptionalJwtAuthGuard)
listPublic(@CurrentUser() user?: JwtPayload) { ... }
```

---

## RÉPONSE API

**Toutes** les réponses sont encapsulées automatiquement par `TransformInterceptor` :
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "...", "version": "v1", "page": 1, "total": 100 }
}
```

Le service **retourne directement les données** — pas d'enveloppe manuelle.

### Pagination
```typescript
import { paginate } from '@/common/helpers/paginate.helper';

const [items, total] = await this.prisma.$transaction([...]);
return paginate(items, total, page, limit);
// → { items, meta: { page, limit, total, totalPages, hasNextPage, ... } }
```

---

## CODES D'ERREUR

Format : `MODULE_NNN` (3 chiffres, zéro-paddé).

```typescript
throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
throw new BadRequestException({ code: 'AUTH_003', message: 'OTP invalide ou expiré' });
throw new ForbiddenException({ code: 'PARENTAL_001', message: 'Contenu restreint' });
```

Codes par module (exemples) :
- `AUTH_001`–`AUTH_010` : authentification, OTP, JWT
- `CONTENT_001`–`CONTENT_010` : contenus VOD
- `BANNER_001` : bannières éditoriales
- `PAYMENT_001`–`PAYMENT_010` : paiements Mobile Money

---

## PRISMA

### Utilisation standard
```typescript
// Service : injecter PrismaService
constructor(private readonly prisma: PrismaService) {}

// Transaction (count + findMany simultané)
const [items, total] = await this.prisma.$transaction([
  this.prisma.content.findMany({ skip, take, where, include }),
  this.prisma.content.count({ where }),
]);

// Update partiel sécurisé
await this.prisma.banner.update({
  where: { id },
  data: {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
  },
});
```

### Migrations (API dockerisée — PAS de `prisma migrate dev` en local)
```bash
# 1. Modifier prisma/schema.prisma
# 2. Créer le répertoire de migration
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_nom_migration/

# 3. Écrire le SQL dans migration.sql
# 4. Appliquer directement sur la base
psql postgresql://ivod:password@localhost:5432/ivod -f migration.sql

# 5. Enregistrer dans la table migrations
psql postgresql://ivod:password@localhost:5432/ivod -c \
  "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) \
   VALUES (gen_random_uuid()::text, 'manual', NOW(), 'YYYYMMDDHHMMSS_nom_migration', 1)"

# 6. Régénérer le client Prisma dans Docker
docker exec ivod-api-dev npx prisma generate

# 7. Redémarrer l'API
docker restart ivod-api-dev
```

---

## MINIO — UPLOAD D'ASSETS

```typescript
// Injection
constructor(private readonly minio: MinioService) {}

// Presigned PUT (upload direct depuis le navigateur — 1 heure TTL)
const uploadUrl = await this.minio.presignedPutUrl(
  this.minio.bucketAssets,  // 'ivod-assets'
  `banners/desktop/${uuid}.jpg`,
  3600
);

// Presigned GET (lecture sécurisée — 24h TTL)
const readUrl = await this.minio.presignedGetUrl(
  this.minio.bucketVideos,
  objectKey
);

// Buckets disponibles
this.minio.bucketAssets   // 'ivod-assets' — images, posters, sous-titres
this.minio.bucketVideos   // 'ivod-videos' — vidéos HLS, segments
```

**Pattern upload côté admin** :
1. `POST /module/upload-url { mimeType, slot }` → `{ uploadUrl, objectKey }`
2. Navigateur : `PUT uploadUrl` avec le fichier binaire
3. Sauvegarder `objectKey` dans la table DB

---

## BULLMQ — JOBS

```typescript
// Enqueue un job (depuis le service API)
import { QueueService } from '@/common/services/queue.service';

await this.queue.add('video.transcode', { assetId, contentId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});

// Processor (worker uniquement — WorkerAppModule)
@Processor('video')
export class VideoPipelineProcessor {
  @Process('video.transcode')
  async handleTranscode(job: Job<{ assetId: string }>) {
    // ...traitement ffmpeg...
  }
}
```

---

## SWAGGER

```typescript
// Documenter chaque endpoint
@ApiOperation({ summary: 'Créer une bannière' })
@ApiParam({ name: 'id', description: 'UUID de la bannière' })
@ApiQuery({ name: 'plan', required: false, enum: ['FREE', 'BASIC', 'PREMIUM'] })
@ApiBody({ type: CreateBannerDto })
@ApiResponse({ status: 201, description: 'Bannière créée' })

// DTO documenté
class CreateBannerDto {
  @ApiProperty({ example: 'Découvrez la saison 2' })
  @IsString() @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ example: ['CI', 'SN'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  countryIds?: string[];
}
```

---

## RATE LIMITING

Configuré globalement : 20 requêtes/minute par IP.
```typescript
// Désactiver sur une route publique haute fréquence
@SkipThrottle()
@Get('stream')
getStream() { ... }
```

---

## AJOUTER UN NOUVEAU MODULE

1. Créer le dossier `src/modules/<nom>/`
2. Créer `<nom>.module.ts`, `<nom>.service.ts`, `<nom>.controller.ts`, `dto/<nom>.dto.ts`
3. Enregistrer dans `src/app.module.ts` (dans la section appropriée)
4. Si le module utilise MinIO : ajouter `MinioService` dans `providers`
5. Si le module a des jobs BullMQ : importer `BullModule.registerQueue({ name: '...' })`

---

## VARIABLES D'ENVIRONNEMENT (apps/api/.env)

```env
# Base de données
DATABASE_URL=postgresql://ivod:password@localhost:5432/ivod

# Redis / BullMQ
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# MinIO (accès interne Docker)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_PUBLIC_ENDPOINT=localhost    # URL accessible depuis le navigateur
MINIO_PUBLIC_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_VIDEOS=ivod-videos
MINIO_BUCKET_ASSETS=ivod-assets

# CORS
CORS_ORIGIN=http://localhost:3001

# Email (SMTP)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Paiements
PAYSTACK_SECRET_KEY=sk_...

# Mode API
IVOD_APP_MODE=api  # ou 'worker'
```

---

## OUTILS DE DEBUG

```bash
# Logs API en temps réel
docker logs -f ivod-api-dev

# Logs worker vidéo
docker logs -f ivod-video-worker-dev

# Shell dans le container API
docker exec -it ivod-api-dev sh

# État des queues BullMQ (via Redis)
docker exec ivod-redis-dev redis-cli llen bull:video:wait

# Requête directe DB
psql postgresql://ivod:password@localhost:5432/ivod -c "SELECT * FROM banners LIMIT 5;"

# Swagger (browser)
open http://localhost:3000/api/v1/docs

# Adminer (DB UI browser)
open http://localhost:8080
```
