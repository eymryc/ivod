import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { MustChangePasswordInterceptor } from './common/interceptors/must-change-password.interceptor';
import { PrismaModule } from './prisma/prisma.module';

// Auth & Utilisateurs
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

// Contenus
import { ContentsModule } from './modules/contents/contents.module';
import { EpisodesModule } from './modules/episodes/episodes.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { GenresModule } from './modules/genres/genres.module';
import { MediaAssetsModule } from './modules/media-assets/media-assets.module';
import { VideosModule } from './modules/videos/videos.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PeopleModule } from './modules/people/people.module';

// Engagement utilisateur
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FollowsModule } from './modules/follows/follows.module';
import { LikesModule } from './modules/likes/likes.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CommentsModule } from './modules/comments/comments.module';
import { WatchSessionsModule } from './modules/watch-sessions/watch-sessions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ParentalControlsModule } from './modules/parental-controls/parental-controls.module';

// Monétisation
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { AdsModule } from './modules/ads/ads.module';
import { DownloadsModule } from './modules/downloads/downloads.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';

// Créateurs & Droits
import { CreatorsModule } from './modules/creators/creators.module';
import { RightsModule } from './modules/rights/rights.module';
import { RightsholdersModule } from './modules/rightsholders/rightsholders.module';
import { GeoRestrictionsModule } from './modules/geo-restrictions/geo-restrictions.module';

// Éditorial & Marketing
import { BannersModule } from './modules/banners/banners.module';
import { AwardsModule } from './modules/awards/awards.module';
import { ModerationModule } from './modules/moderation/moderation.module';

// Home
import { HomeModule } from './modules/home/home.module';

// Analytics & Découverte
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SearchModule } from './modules/search/search.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';

// Live & Communication
import { LiveModule } from './modules/live/live.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DevicesModule } from './modules/devices/devices.module';

// Référentiels & Admin
import { ReferencesModule } from './modules/references/references.module';
import { AdminModule } from './modules/admin/admin.module';
import { SecurityLogsModule } from './modules/security-logs/security-logs.module';
import { HealthModule } from './modules/health/health.module';
import { CronModule } from './modules/cron/cron.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: process.env.TEST_MODE === 'true' ? 10000 : 20 }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379' },
      }),
    }),
    PrismaModule,
    // Auth & Utilisateurs
    AuthModule, UsersModule, ProfilesModule,
    // Contenus
    ContentsModule, EpisodesModule, SeasonsModule, GenresModule, MediaAssetsModule, VideosModule, CategoriesModule, PeopleModule,
    // Engagement
    FavoritesModule, FollowsModule, LikesModule, ReviewsModule, CommentsModule, WatchSessionsModule,
    ReportsModule, ParentalControlsModule,
    // Monétisation
    SubscriptionsModule, PaymentsModule, InvoicesModule, RefundsModule, DownloadsModule, AdsModule, RevenueModule,
    // Créateurs & Droits
    CreatorsModule, RightsModule, RightsholdersModule, GeoRestrictionsModule,
    // Éditorial
    BannersModule, AwardsModule, ModerationModule, CampaignsModule,
    // Home
    HomeModule,
    // Analytics & Découverte
    AnalyticsModule, SearchModule, RecommendationsModule,
    // Live & Communication
    LiveModule, NotificationsModule, DevicesModule,
    // Référentiels & Admin
    ReferencesModule, AdminModule, SecurityLogsModule,     HealthModule,
    CronModule,
    StorageModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: MustChangePasswordInterceptor }],
})
export class AppModule {}
