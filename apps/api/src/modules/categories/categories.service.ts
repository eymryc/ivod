import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from '../references/dto/references.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.category.findMany({
      orderBy: { code: 'asc' },
    });
  }

  getOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.category.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
