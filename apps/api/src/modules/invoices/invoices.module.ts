import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
@Module({ imports: [PrismaModule], providers: [InvoicesService], controllers: [InvoicesController], exports: [InvoicesService] })
export class InvoicesModule {}
