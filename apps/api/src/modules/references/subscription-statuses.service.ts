import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class SubscriptionStatusesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.subscriptionStatusRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.subscriptionStatusRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.subscriptionStatusRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.subscriptionStatusRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.subscriptionStatusRef.delete({ where: { id } });
  }
}
