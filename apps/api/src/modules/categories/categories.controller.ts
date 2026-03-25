import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { CreateReferenceDto, UpdateReferenceDto } from '../references/dto/references.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List content categories' })
  @ApiSuccessResponse({
    description: 'Categories list',
    example: {
      success: true,
      data: [{ code: 'FILM', label: 'Film' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  list() {
    return this.categoriesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one content category' })
  getOne(@Param('id') id: string) {
    return this.categoriesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create content category' })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('category.create')
  create(@Body() dto: CreateReferenceDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content category' })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('category.update')
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content category' })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('category.delete')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
