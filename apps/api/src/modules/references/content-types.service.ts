import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@Injectable()
export class ContentTypesService {
  constructor(private prisma: PrismaService) {}

  private mapTypeCode(code: string): string {
    const normalized = String(code ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_')
    if (normalized === 'FILM') return 'SINGLE'
    if (normalized === 'SERIE') return 'SERIES'
    if (normalized === 'WEB_SERIE') return 'WEB_SERIES'
    return normalized
  }

  list() {
    return this.prisma.contentTypeRef.findMany({ orderBy: { code: 'asc' } });
  }

  getOne(id: string) {
    return this.prisma.contentTypeRef.findUnique({ where: { id } });
  }

  create(dto: CreateReferenceDto) {
    return this.prisma.contentTypeRef.create({
      data: { code: dto.code, label: dto.label, typeCode: this.mapTypeCode(dto.code) },
    });
  }

  async update(id: string, dto: UpdateReferenceDto) {
    const existing = await this.prisma.contentTypeRef.findUnique({ where: { id } });
    if (!existing) return this.prisma.contentTypeRef.update({ where: { id }, data: dto });

    const nextTypeCode = dto.code ? this.mapTypeCode(dto.code) : existing.typeCode;
    return this.prisma.contentTypeRef.update({
      where: { id },
      data: { ...dto, typeCode: nextTypeCode },
    });
  }

  remove(id: string) {
    return this.prisma.contentTypeRef.delete({ where: { id } });
  }
}
