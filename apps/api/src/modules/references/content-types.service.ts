import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentTypesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.refContentType.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.refContentType.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.refContentType.create({ data: { ...dto, typeCode: (dto as any).typeCode ?? dto.code } });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.refContentType.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.refContentType.delete({ where: { id } });
  }
}
