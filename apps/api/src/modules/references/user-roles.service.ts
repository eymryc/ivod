import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class UserRolesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.userRoleRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.userRoleRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.userRoleRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.userRoleRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.userRoleRef.delete({ where: { id } });
  }
}
