import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MustChangePasswordInterceptor } from './common/interceptors/must-change-password.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContentsModule } from './modules/contents/contents.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { VideosModule } from './modules/videos/videos.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FollowsModule } from './modules/follows/follows.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ReferencesModule } from './modules/references/references.module';
import { PrismaModule } from './prisma/prisma.module';
import { RightsModule } from './modules/rights/rights.module';
import { RevenueSharingModule } from './modules/revenue-sharing/revenue-sharing.module';
import { RightsholdersModule } from './modules/rightsholders/rightsholders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentsModule,
    CreatorsModule,
    SubscriptionsModule,
    VideosModule,
    NotificationsModule,
    FavoritesModule,
    FollowsModule,
    AdminModule,
    CategoriesModule,
    ReferencesModule,
    RightsModule,
    RevenueSharingModule,
    RightsholdersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MustChangePasswordInterceptor,
    },
  ],
})
export class AppModule {}
