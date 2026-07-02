import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentStatusesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.refContentStatus.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.refContentStatus.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.refContentStatus.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.refContentStatus.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.refContentStatus.delete({ where: { id } });
  }
}
