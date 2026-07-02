import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from '../references/dto/references.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.refGenre.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.refGenre.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.refGenre.create({ data: { ...dto, slug: (dto as any).slug ?? dto.code.toLowerCase() } });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.refGenre.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.refGenre.delete({ where: { id } });
  }
}
