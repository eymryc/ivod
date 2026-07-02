import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';
import { ContentStatusesController } from './content-statuses.controller';
import { ContentStatusesService } from './content-statuses.service';
import { ContentVisibilitiesController } from './content-visibilities.controller';
import { ContentVisibilitiesService } from './content-visibilities.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ReferencesService,
    UserRolesService,
    ContentTypesService,
    ContentStatusesService,
    ContentVisibilitiesService,
  ],
  controllers: [
    ReferencesController,
    UserRolesController,
    ContentTypesController,
    ContentStatusesController,
    ContentVisibilitiesController,
  ],
})
export class ReferencesModule {}
