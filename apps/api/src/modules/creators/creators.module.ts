import { Module } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreatorsController } from './creators.controller';
import { MailModule } from '../mail/mail.module';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { WatchSessionsModule } from '../watch-sessions/watch-sessions.module';

@Module({
  imports: [MailModule, WatchSessionsModule],
  controllers: [CreatorsController],
  providers: [CreatorsService, ContentDurationService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
