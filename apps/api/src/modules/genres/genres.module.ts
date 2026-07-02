import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
@Module({ imports: [PrismaModule], providers: [GenresService], controllers: [GenresController], exports: [GenresService] })
export class GenresModule {}
