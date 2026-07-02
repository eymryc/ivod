# Générer un module NestJS iVOD

Crée un module NestJS complet selon le pattern iVOD.
Argument attendu : le nom du module (ex: "campaigns", "subtitles", "playlists")

## Étapes d'exécution

### 1. Créer la structure
```
apps/api/src/modules/<nom>/
├── <nom>.module.ts
├── <nom>.controller.ts
├── <nom>.service.ts
└── dto/
    └── <nom>.dto.ts
```

### 2. Template module
```typescript
// <nom>.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NomController } from './<nom>.controller';
import { NomService } from './<nom>.service';

@Module({
  imports: [PrismaModule],
  providers: [NomService],
  controllers: [NomController],
  exports: [NomService],
})
export class NomModule {}
```

### 3. Template controller
```typescript
// <nom>.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NomService } from './<nom>.service';
import { CreateNomDto, UpdateNomDto } from './dto/<nom>.dto';

@ApiTags('<Nom>')
@Controller('<route>')
export class NomController {
  constructor(private readonly service: NomService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les <noms>' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  list(@Query('page') page = 1) {
    return this.service.list(page);
  }

  @Post()
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un <nom> (admin)' })
  @ApiBody({ type: CreateNomDto })
  create(@Body() dto: CreateNomDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier un <nom>' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateNomDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un <nom>' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### 4. Template service
```typescript
// <nom>.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginate.helper';

@Injectable()
export class NomService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page: number, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.<modele>.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.<modele>.count(),
    ]);
    return paginate(items, total, page, limit);
  }

  async create(dto: { /* champs */ }) {
    return this.prisma.<modele>.create({ data: dto });
  }

  async update(id: string, dto: Partial<typeof dto>) {
    if (!await this.prisma.<modele>.findUnique({ where: { id } })) {
      throw new NotFoundException({ code: 'NOM_001', message: '<Nom> introuvable' });
    }
    return this.prisma.<modele>.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    if (!await this.prisma.<modele>.findUnique({ where: { id } })) {
      throw new NotFoundException({ code: 'NOM_001', message: '<Nom> introuvable' });
    }
    await this.prisma.<modele>.delete({ where: { id } });
    return { message: '<Nom> supprimé' };
  }
}
```

### 5. Template DTO
```typescript
// dto/<nom>.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateNomDto {
  @ApiProperty({ example: 'Nom exemple' })
  @IsString() @MinLength(1)
  nom!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}

export class UpdateNomDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) nom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
```

### 6. Enregistrer dans app.module.ts
Ajouter dans la section appropriée de `apps/api/src/app.module.ts` :
```typescript
import { NomModule } from './modules/<nom>/<nom>.module';
// Dans imports: [..., NomModule]
```

### 7. Si MinIO nécessaire
```typescript
// Dans <nom>.module.ts
import { MinioService } from '../../common/services/minio.service';
// providers: [NomService, MinioService]
// Dans le service: constructor(private minio: MinioService) {}
```

### 8. Redémarrer l'API
```bash
docker restart ivod-api-dev
docker logs --tail=30 ivod-api-dev
```
