import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { MailModule } from '../mail/mail.module';
import { RefundsModule } from '../refunds/refunds.module';
import { PaymentProvidersModule } from './payment-providers.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsCoreModule,
    MailModule,
    PaymentProvidersModule,
    forwardRef(() => RefundsModule),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentProvidersModule],
})
export class PaymentsModule {}
