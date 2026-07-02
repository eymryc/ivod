import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReferencesService } from './references.service';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';
import { REFERENCE_RESOURCES, ReferenceResource } from './references.service';

@ApiTags('References')
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all reference tables' })
  @ApiSuccessResponse({
    description: 'Reference data',
    example: {
      success: true,
      data: { contentStatuses: [{ code: 'PUBLISHED' }], contentVisibilities: [{ code: 'PUBLIC' }] },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  listAll() {
    return this.referencesService.listAll();
  }

  @Get(':resource')
  @Public()
  @ApiOperation({ summary: 'List records for one reference table' })
  listByResource(@Param('resource') resource: ReferenceResource) {
    return this.referencesService.list(this.parseResource(resource));
  }

  @Get(':resource/:id')
  @Public()
  @ApiOperation({ summary: 'Get one reference record by id' })
  getOne(@Param('resource') resource: ReferenceResource, @Param('id') id: string) {
    return this.referencesService.getOne(this.parseResource(resource), id);
  }

  @Post(':resource')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create one reference record (admin)' })
  create(@Param('resource') resource: ReferenceResource, @Body() dto: CreateReferenceDto) {
    return this.referencesService.create(this.parseResource(resource), dto);
  }

  @Patch(':resource/:id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update one reference record (admin)' })
  update(
    @Param('resource') resource: ReferenceResource,
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(this.parseResource(resource), id, dto);
  }

  @Delete(':resource/:id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete one reference record (admin)' })
  remove(@Param('resource') resource: ReferenceResource, @Param('id') id: string) {
    return this.referencesService.remove(this.parseResource(resource), id);
  }

  private parseResource(resource: string): ReferenceResource {
    if (REFERENCE_RESOURCES.includes(resource as ReferenceResource)) {
      return resource as ReferenceResource;
    }
    throw new BadRequestException(
      `Invalid resource "${resource}". Allowed: ${REFERENCE_RESOURCES.join(', ')}`,
    );
  }
}
