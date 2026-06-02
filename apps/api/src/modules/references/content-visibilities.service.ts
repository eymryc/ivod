import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentVisibilitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.refContentVisibility.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.refContentVisibility.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.refContentVisibility.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.refContentVisibility.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.refContentVisibility.delete({ where: { id } });
  }
}
