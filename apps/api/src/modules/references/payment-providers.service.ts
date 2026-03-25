import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class PaymentProvidersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.paymentProviderRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.paymentProviderRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.paymentProviderRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.paymentProviderRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.paymentProviderRef.delete({ where: { id } });
  }
}
