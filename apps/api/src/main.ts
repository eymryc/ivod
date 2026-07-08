import './instrument';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createAppLogger } from './common/logger/winston.logger';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: WinstonModule.createLogger({ instance: createAppLogger() }),
  });

  // Diffuse les événements WebSocket (NotificationsGateway) entre tous les
  // réplicas API via Redis pub/sub — indispensable dès qu'il y a plus d'une
  // instance API (voir apps/api/docker-compose.prod.yml : api_1/api_2).
  const redisIoAdapter = new RedisIoAdapter(app, process.env.REDIS_URL ?? 'redis://localhost:6379');
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(
    helmet({
      // Affiches / vignettes chargées depuis le front (origine différente en dev :3001 vs :3000)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('iVOD API')
    .setDescription('API iVOD (VOD / streaming / entitlements)')
    .setVersion('1.0')
    .addTag('Auth', 'Authentification OTP/JWT, login, inscription, mots de passe et securite d acces.')
    .addTag('Users', 'Gestion du profil utilisateur, informations personnelles et preferences de compte.')
    .addTag('Roles', 'Referentiel des roles applicatifs exposes au front (affichage/admin UI).')
    .addTag('Categories', 'Referentiel des categories editoriales pour classer films, series et contenus.')
    .addTag('Content Types', 'Referentiel des types de contenu (single, serie, etc.) utilises par le catalogue.')
    .addTag('Content Statuses', 'Referentiel des statuts de cycle de vie (uploading, processing, published, rejected...).')
    .addTag('Content Visibilities', 'Referentiel de visibilite (public, premium_only, ppv, private) pour les regles d acces.')
    .addTag('References', 'Point d entree legacy/agregation des referentiels (usage compatibilite).')
    .addTag(
      'Creators',
      'Profil operationnel createur/uploader (distinct des ayants droit). Creation reservee au role ADMIN : POST /creators ou POST /admin/creators (utilisateur existant + synchro RBAC CREATOR). Liste GET /creators ; espace connecte GET /creators/me*, analytics ; POST /creators/register desactive (deprecated).',
    )
    .addTag('Contents', 'Catalogue VOD principal: CRUD contenu, episodes, progression de lecture et entitlement.')
    .addTag('Videos', 'Flux video technique: upload Mux, statut encodage, streaming signe et telechargements.')
    .addTag('Favorites', 'Favoris utilisateur pour suivre rapidement les contenus preferes.')
    .addTag('Follows', 'Suivi des createurs par les viewers et mecanique communautaire.')
    .addTag('Notifications', 'Notifications utilisateur (lecture, nouveautes, systeme).')
    .addTag('Admin', 'Back-office de moderation, supervision KPI, activation utilisateurs et operations sensibles.')
    .addTag('Rights', 'Gestion juridique des droits: contrats, perimetres d exploitation et droits par contenu.')
    .addTag('Rightsholders', 'Ayants droit legaux (producteurs, societes, distributeurs, realisateurs) pour la chaine de droits.')
    .addTag('Health', 'Disponibilité de l\'API et de ses dépendances.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'BearerAuth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const devOrigins = isProduction ? [] : ['http://localhost:3001', 'http://127.0.0.1:3001'];
  const allowedOrigins = Array.from(new Set([...devOrigins, ...configuredOrigins]));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Par défaut, Nest aplatit les erreurs en messages anglais bruts de
      // class-validator ("email must be an email") avant même qu'ils
      // n'atteignent GlobalExceptionFilter. On renvoie les ValidationError
      // brutes (avec leurs `constraints`) pour que le filtre puisse les
      // traduire en français à partir de la clé de contrainte, pas du texte.
      exceptionFactory: (errors) => new BadRequestException({ message: errors }),
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 iVOD API démarrée sur le port ${process.env.PORT ?? 3000}`);
}
bootstrap();
