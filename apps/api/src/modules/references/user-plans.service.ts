import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class UserPlansService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.userPlanRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.userPlanRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.userPlanRef.create({ data: dto });
  }

  update(id: string, dto: UpdateReferenceDto) {
    return this.prisma.userPlanRef.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.userPlanRef.delete({ where: { id } });
  }
}
