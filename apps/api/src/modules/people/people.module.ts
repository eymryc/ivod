import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
@Module({ imports: [PrismaModule], providers: [PeopleService], controllers: [PeopleController], exports: [PeopleService] })
export class PeopleModule {}
