import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class PaymentStatusesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.paymentStatusRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.paymentStatusRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.paymentStatusRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.paymentStatusRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.paymentStatusRef.delete({ where: { id } });
  }
}
