import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class UserRolesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.refUserRole.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.refUserRole.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.refUserRole.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.refUserRole.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.refUserRole.delete({ where: { id } });
  }
}
