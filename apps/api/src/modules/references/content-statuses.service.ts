import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentStatusesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.contentStatusRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.contentStatusRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.contentStatusRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.contentStatusRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.contentStatusRef.delete({ where: { id } });
  }
}
