import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentVisibilitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.contentVisibilityRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.contentVisibilityRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.contentVisibilityRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.contentVisibilityRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.contentVisibilityRef.delete({ where: { id } });
  }
}
