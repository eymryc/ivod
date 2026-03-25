import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { UserPlansController } from './user-plans.controller';
import { UserPlansService } from './user-plans.service';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';
import { ContentStatusesController } from './content-statuses.controller';
import { ContentStatusesService } from './content-statuses.service';
import { ContentVisibilitiesController } from './content-visibilities.controller';
import { ContentVisibilitiesService } from './content-visibilities.service';
import { SubscriptionStatusesController } from './subscription-statuses.controller';
import { SubscriptionStatusesService } from './subscription-statuses.service';
import { PaymentProvidersController } from './payment-providers.controller';
import { PaymentProvidersService } from './payment-providers.service';
import { PaymentStatusesController } from './payment-statuses.controller';
import { PaymentStatusesService } from './payment-statuses.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ReferencesService,
    UserRolesService,
    UserPlansService,
    ContentTypesService,
    ContentStatusesService,
    ContentVisibilitiesService,
    SubscriptionStatusesService,
    PaymentProvidersService,
    PaymentStatusesService,
  ],
  controllers: [
    ReferencesController,
    UserRolesController,
    UserPlansController,
    ContentTypesController,
    ContentStatusesController,
    ContentVisibilitiesController,
    SubscriptionStatusesController,
    PaymentProvidersController,
    PaymentStatusesController,
  ],
})
export class ReferencesModule {}
