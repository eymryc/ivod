import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentTypesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.contentTypeRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.contentTypeRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.contentTypeRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.contentTypeRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.contentTypeRef.delete({ where: { id } });
  }
}
