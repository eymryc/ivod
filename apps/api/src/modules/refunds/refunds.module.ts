import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { PaymentProvidersModule } from '../payments/payment-providers.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule, MailModule, NotificationsCoreModule, PaymentProvidersModule],
  providers: [RefundsService],
  controllers: [RefundsController],
  exports: [RefundsService],
})
export class RefundsModule {}
